const Room = require('../models/roomModel');
const Hotel = require('../models/hotelModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { blockingFilter, releaseExpiredHolds, todayUTC } = require('../utils/bookingUtils');

const ROOM_FIELDS = ['roomNumber', 'type', 'floor', 'pricePerNight', 'capacity', 'beds', 'amenities', 'description', 'images', 'status', 'isActive'];
const pick = (body, keys) => Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// GET /api/rooms?hotel=&type=&status=   (admin: all rooms incl. inactive when ?all=1)
exports.getRooms = asyncHandler(async (req, res) => {
  const filter = {};
  if (!(req.role === 'admin' && req.query.all)) filter.isActive = true;
  ['hotel', 'type', 'status'].forEach((k) => { if (req.query[k]) filter[k] = req.query[k]; });
  const rooms = await Room.find(filter).sort({ hotel: 1, roomNumber: 1 }).populate('hotel', 'name city');
  res.json({ success: true, count: rooms.length, rooms });
});

// GET /api/rooms/:id
exports.getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, isActive: true }).populate('hotel', 'name city address checkInTime checkOutTime');
  if (!room) throw new AppError('Room not found', 404);
  res.json({ success: true, room });
});

// GET /api/rooms/:id/availability  - upcoming blocked date ranges (for a calendar)
exports.getAvailability = asyncHandler(async (req, res) => {
  await releaseExpiredHolds(req.params.id);
  const booked = await Booking.find({ room: req.params.id, checkOut: { $gt: todayUTC() }, ...blockingFilter() })
    .select('checkIn checkOut status').sort({ checkIn: 1 });
  res.json({ success: true, booked: booked.map((b) => ({ checkIn: b.checkIn, checkOut: b.checkOut })) });
});

// POST /api/rooms   body: { hotel, roomNumber, type, pricePerNight, capacity, ... }
exports.createRoom = asyncHandler(async (req, res) => {
  if (!req.body.hotel) throw new AppError('hotel is required', 400);
  if (!(await Hotel.exists({ _id: req.body.hotel }))) throw new AppError('Hotel not found', 404);
  const room = await Room.create({ hotel: req.body.hotel, ...pick(req.body, ROOM_FIELDS) });
  res.status(201).json({ success: true, room });
});

// PUT /api/rooms/:id
exports.updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, pick(req.body, ROOM_FIELDS), { new: true, runValidators: true });
  if (!room) throw new AppError('Room not found', 404);
  res.json({ success: true, room });
});

// DELETE /api/rooms/:id  - blocked while the room has upcoming/active bookings
exports.deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new AppError('Room not found', 404);
  if (await Booking.exists({ room: room._id, status: { $in: ['pending', 'confirmed', 'checked_in'] } })) {
    throw new AppError('Room has active bookings. Set it to maintenance / inactive instead.', 400);
  }
  await room.deleteOne();
  res.json({ success: true, message: 'Room deleted' });
});
