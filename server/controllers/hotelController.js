const Hotel = require('../models/hotelModel');
const Room = require('../models/roomModel');
const Booking = require('../models/bookingModel');
const Review = require('../models/reviewModel');
const Favourite = require('../models/favouriteModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { validateStay, bookedRoomIds, releaseExpiredHolds } = require('../utils/bookingUtils');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const HOTEL_FIELDS = ['name', 'city', 'address', 'description', 'images', 'amenities', 'starRating', 'contactPhone', 'contactEmail', 'checkInTime', 'checkOutTime', 'isActive'];
const pick = (body, keys) => Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// GET /api/hotels?search&city&stars&minPrice&maxPrice&amenity&checkIn&checkOut&guests&sort&page&limit
// With checkIn + checkOut (+ guests) only hotels that still have a free room are returned.
exports.getHotels = asyncHandler(async (req, res) => {
  const { search, city, stars, amenity, checkIn, checkOut, sort } = req.query;
  const guests = Number(req.query.guests) || 1;
  const minPrice = Number(req.query.minPrice) || 0;
  const maxPrice = Number(req.query.maxPrice) || Infinity;
  const p = Math.max(Number(req.query.page) || 1, 1);
  const l = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);

  const filter = { isActive: true };
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ name: rx }, { city: rx }];
  }
  if (city) filter.city = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
  if (stars) filter.starRating = { $gte: Number(stars) };
  if (amenity) filter.amenities = { $regex: `^${escapeRegex(amenity)}$`, $options: 'i' };

  const sorts = { rating: { averageRating: -1 }, stars: { starRating: -1 }, newest: { createdAt: -1 }, name: { name: 1 } };
  const hotels = await Hotel.find(filter).sort(sorts[sort] || sorts.rating).lean();
  if (hotels.length === 0) return res.json({ success: true, total: 0, page: p, pages: 0, hotels: [] });

  // candidate rooms per hotel (bookable, big enough, inside the price range)
  let rooms = await Room.find({
    hotel: { $in: hotels.map((h) => h._id) },
    isActive: true,
    status: 'available',
    capacity: { $gte: guests },
    pricePerNight: { $gte: minPrice, $lte: maxPrice },
  }).lean();

  const hasDates = checkIn && checkOut;
  if (hasDates) {
    const stay = validateStay(checkIn, checkOut);
    await releaseExpiredHolds();
    const taken = new Set(await bookedRoomIds(stay.checkIn, stay.checkOut, rooms.map((r) => r._id)));
    rooms = rooms.filter((r) => !taken.has(String(r._id)));
  }

  const stats = {};
  rooms.forEach((r) => {
    const k = String(r.hotel);
    stats[k] = stats[k] || { startingPrice: Infinity, roomsAvailable: 0 };
    stats[k].startingPrice = Math.min(stats[k].startingPrice, r.pricePerNight);
    stats[k].roomsAvailable += 1;
  });

  // hide hotels with no matching room only when the guest used a room-based filter
  const roomFilterUsed = hasDates || req.query.guests || req.query.minPrice || req.query.maxPrice;
  let result = hotels.map((h) => ({ ...h, ...(stats[String(h._id)] || { startingPrice: null, roomsAvailable: 0 }) }));
  if (roomFilterUsed) result = result.filter((h) => h.roomsAvailable > 0);
  if (sort === 'price_asc') result.sort((a, b) => (a.startingPrice ?? Infinity) - (b.startingPrice ?? Infinity));
  if (sort === 'price_desc') result.sort((a, b) => (b.startingPrice ?? 0) - (a.startingPrice ?? 0));

  const total = result.length;
  res.json({ success: true, total, page: p, pages: Math.ceil(total / l), hotels: result.slice((p - 1) * l, p * l) });
});

// GET /api/hotels/cities  - distinct cities for the search box
exports.getCities = asyncHandler(async (req, res) => {
  const cities = await Hotel.distinct('city', { isActive: true });
  res.json({ success: true, cities: cities.sort() });
});

// GET /api/hotels/:id?checkIn&checkOut&guests  - hotel + its rooms (with availability if dates are given)
exports.getHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findOne({ _id: req.params.id, ...(req.role === 'admin' ? {} : { isActive: true }) }).lean();
  if (!hotel) throw new AppError('Hotel not found', 404);

  const rooms = await Room.find({ hotel: hotel._id, isActive: true }).sort({ pricePerNight: 1, roomNumber: 1 }).lean();
  let taken = new Set();
  let nights = null;
  if (req.query.checkIn && req.query.checkOut) {
    const stay = validateStay(req.query.checkIn, req.query.checkOut);
    nights = stay.nights;
    await releaseExpiredHolds();
    taken = new Set(await bookedRoomIds(stay.checkIn, stay.checkOut, rooms.map((r) => r._id)));
  }
  const guests = Number(req.query.guests) || 0;

  const withAvailability = rooms.map((r) => ({
    ...r,
    available: r.status === 'available' && !taken.has(String(r._id)) && r.capacity >= guests,
    unavailableReason: r.status !== 'available' ? 'Under maintenance' : taken.has(String(r._id)) ? 'Booked for these dates' : r.capacity < guests ? 'Too small for your group' : null,
  }));

  let isFavourite = false;
  if (req.user && req.role === 'user') isFavourite = !!(await Favourite.exists({ user: req.user._id, hotel: hotel._id }));

  res.json({ success: true, hotel, rooms: withAvailability, nights, isFavourite });
});

// ----- admin -----

// POST /api/hotels
exports.createHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.create(pick(req.body, HOTEL_FIELDS));
  res.status(201).json({ success: true, hotel });
});

// PUT /api/hotels/:id
exports.updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, pick(req.body, HOTEL_FIELDS), { new: true, runValidators: true });
  if (!hotel) throw new AppError('Hotel not found', 404);
  res.json({ success: true, hotel });
});

// GET /api/hotels/admin/all  - includes inactive hotels, with room counts
exports.getAllHotelsAdmin = asyncHandler(async (req, res) => {
  const [hotels, counts] = await Promise.all([
    Hotel.find().sort({ createdAt: -1 }).lean(),
    Room.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$hotel', rooms: { $sum: 1 } } }]),
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.rooms]));
  res.json({ success: true, hotels: hotels.map((h) => ({ ...h, roomCount: map[String(h._id)] || 0 })) });
});

// DELETE /api/hotels/:id  - blocked while there are active bookings
exports.deleteHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) throw new AppError('Hotel not found', 404);
  const active = await Booking.exists({ hotel: hotel._id, status: { $in: ['pending', 'confirmed', 'checked_in'] } });
  if (active) throw new AppError('Hotel has active bookings. Cancel them first or deactivate the hotel instead.', 400);
  await Promise.all([Room.deleteMany({ hotel: hotel._id }), Review.deleteMany({ hotel: hotel._id }), Favourite.deleteMany({ hotel: hotel._id }), hotel.deleteOne()]);
  res.json({ success: true, message: 'Hotel deleted' });
});
