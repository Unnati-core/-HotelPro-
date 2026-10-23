const Admin = require('../models/adminModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const Hotel = require('../models/hotelModel');
const Room = require('../models/roomModel');
const Review = require('../models/reviewModel');
const Favourite = require('../models/favouriteModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendToken } = require('../utils/generateToken');
const { todayUTC, DAY, releaseExpiredHolds } = require('../utils/bookingUtils');

// POST /api/admin/login
exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);
  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
  if (!admin || !(await admin.matchPassword(password))) throw new AppError('Invalid admin credentials', 401);
  sendToken(res, 200, admin, 'admin');
});

// GET /api/admin/dashboard  - overview + report data
exports.getDashboard = asyncHandler(async (req, res) => {
  await releaseExpiredHolds();
  const today = todayUTC();
  const tomorrow = new Date(today.getTime() + DAY);
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY);
  const paid = { status: { $in: ['confirmed', 'checked_in', 'checked_out'] } };

  const [users, hotels, rooms, occupied, arrivals, departures, bookingsByStatus, revenueAgg, topHotels, daily] = await Promise.all([
    User.countDocuments(),
    Hotel.countDocuments({ isActive: true }),
    Room.countDocuments({ isActive: true, status: 'available' }),
    // rooms with a guest staying tonight
    Booking.distinct('room', { status: { $in: ['confirmed', 'checked_in'] }, checkIn: { $lte: today }, checkOut: { $gt: today } }),
    Booking.countDocuments({ status: 'confirmed', checkIn: { $gte: today, $lt: tomorrow } }),
    Booking.countDocuments({ status: 'checked_in', checkOut: { $gte: today, $lt: tomorrow } }),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: paid }, { $group: { _id: null, revenue: { $sum: '$totalAmount' }, nights: { $sum: '$nights' } } }]),
    Booking.aggregate([
      { $match: paid },
      { $group: { _id: '$hotel', revenue: { $sum: '$totalAmount' }, nights: { $sum: '$nights' }, bookings: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'hotels', localField: '_id', foreignField: '_id', as: 'hotel' } },
      { $unwind: '$hotel' },
      { $project: { _id: 0, hotelId: '$_id', name: '$hotel.name', city: '$hotel.city', revenue: 1, nights: 1, bookings: 1 } },
    ]),
    Booking.aggregate([
      { $match: { ...paid, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, bookings: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    success: true,
    stats: {
      users, hotels, rooms,
      occupiedTonight: occupied.length,
      occupancyRate: rooms ? Math.round((occupied.length / rooms) * 100) : 0,
      arrivalsToday: arrivals,
      departuresToday: departures,
      totalRevenue: revenueAgg[0] ? revenueAgg[0].revenue : 0,
      nightsBooked: revenueAgg[0] ? revenueAgg[0].nights : 0,
      bookingsByStatus: Object.fromEntries(bookingsByStatus.map((b) => [b._id, b.count])),
    },
    topHotels,
    last7Days: daily.map((d) => ({ date: d._id, bookings: d.bookings, revenue: d.revenue })),
  });
});

// GET /api/admin/users?search=&page=&limit=
exports.getUsers = asyncHandler(async (req, res) => {
  const p = Math.max(Number(req.query.page) || 1, 1);
  const l = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const filter = {};
  if (req.query.search) {
    const rx = { $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, total, page: p, pages: Math.ceil(total / l), users });
});

// GET /api/admin/users/:id  - guest profile + stay history
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  const bookings = await Booking.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).populate('hotel', 'name').populate('room', 'roomNumber type');
  res.json({ success: true, user, bookings });
});

// PUT /api/admin/users/:id   body: { name?, phone?, isActive? }
exports.updateUser = asyncHandler(async (req, res) => {
  const allowed = {};
  ['name', 'phone', 'isActive'].forEach((k) => { if (req.body[k] !== undefined) allowed[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true });
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, user });
});

// DELETE /api/admin/users/:id
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (await Booking.exists({ user: user._id, status: { $in: ['pending', 'confirmed', 'checked_in'] } })) {
    throw new AppError('Guest has active bookings. Deactivate the account instead (isActive: false).', 400);
  }
  const reviews = await Review.find({ user: user._id });
  await Promise.all([Review.deleteMany({ user: user._id }), Favourite.deleteMany({ user: user._id }), user.deleteOne()]);
  await Promise.all([...new Set(reviews.map((r) => String(r.hotel)))].map((h) => Review.recalculate(h)));
  res.json({ success: true, message: 'User deleted' });
});

// GET /api/admin/bookings?status=&hotel=&user=&date=YYYY-MM-DD&page=&limit=
// "date" returns stays that include that day (handy for the front desk)
exports.getAllBookings = asyncHandler(async (req, res) => {
  await releaseExpiredHolds();
  const p = Math.max(Number(req.query.page) || 1, 1);
  const l = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const filter = {};
  ['status', 'hotel', 'user', 'room'].forEach((k) => { if (req.query[k]) filter[k] = req.query[k]; });
  if (req.query.date) {
    const d = new Date(`${req.query.date}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) { filter.checkIn = { $lte: d }; filter.checkOut = { $gt: d }; }
  }
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .populate('user', 'name email phone')
      .populate('hotel', 'name city')
      .populate('room', 'roomNumber type'),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, total, page: p, pages: Math.ceil(total / l), bookings });
});
