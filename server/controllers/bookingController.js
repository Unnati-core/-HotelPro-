const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');
const Hotel = require('../models/hotelModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { validateStay, calcPrice, releaseExpiredHolds, findConflict, DAY, todayUTC } = require('../utils/bookingUtils');
const { processPayment } = require('../utils/paymentGateway');
const { sendEmail, bookingConfirmationEmail, bookingCancelledEmail, checkoutEmail } = require('../utils/sendEmail');

const populateBooking = (q) =>
  q.populate('hotel', 'name city address checkInTime checkOutTime images')
    .populate('room', 'roomNumber type beds capacity');

// POST /api/bookings   body: { roomId, checkIn: "YYYY-MM-DD", checkOut: "YYYY-MM-DD", guests, specialRequests }
// Step 1: holds the room (status "pending") for ROOM_HOLD_MINUTES. Pay with POST /:id/pay
exports.createBooking = asyncHandler(async (req, res) => {
  const { roomId, specialRequests } = req.body;
  const guests = Number(req.body.guests) || 1;
  if (!roomId) throw new AppError('roomId is required', 400);
  const { checkIn, checkOut, nights } = validateStay(req.body.checkIn, req.body.checkOut);

  const room = await Room.findOne({ _id: roomId, isActive: true });
  if (!room) throw new AppError('Room not found', 404);
  if (room.status !== 'available') throw new AppError('This room is currently under maintenance', 400);
  if (guests < 1 || guests > room.capacity) throw new AppError(`This room fits at most ${room.capacity} guest(s)`, 400);
  const hotel = await Hotel.findOne({ _id: room.hotel, isActive: true });
  if (!hotel) throw new AppError('Hotel is not accepting bookings', 400);

  await releaseExpiredHolds(room._id);
  if (await findConflict(room._id, checkIn, checkOut)) {
    throw new AppError('This room is not available for the selected dates. Please choose other dates or another room.', 409);
  }

  const holdMinutes = Number(process.env.ROOM_HOLD_MINUTES) || 10;
  const booking = await Booking.create({
    user: req.user._id, hotel: hotel._id, room: room._id,
    checkIn, checkOut, nights, guests, specialRequests,
    pricePerNight: room.pricePerNight,
    ...calcPrice(room.pricePerNight, nights),
    expiresAt: new Date(Date.now() + holdMinutes * 60000),
  });

  // Double-booking guard: if another overlapping booking was created at the same moment,
  // the one created FIRST wins and this one is rolled back.
  const clash = await findConflict(room._id, checkIn, checkOut, booking._id);
  if (clash && clash.createdAt <= booking.createdAt) {
    await booking.deleteOne();
    throw new AppError('Someone just booked this room. Please choose other dates or another room.', 409);
  }

  res.status(201).json({
    success: true,
    message: `Room held. Complete payment before ${booking.expiresAt.toISOString()}`,
    booking: await populateBooking(Booking.findById(booking._id)),
  });
});

// POST /api/bookings/:id/pay   body: { method: "card|upi|netbanking|wallet", details: {...} }
exports.payForBooking = asyncHandler(async (req, res) => {
  const { method, details } = req.body;
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status === 'confirmed') throw new AppError('This booking is already paid', 400);
  if (booking.status !== 'pending' || booking.expiresAt < new Date()) {
    await releaseExpiredHolds(booking.room);
    throw new AppError('Room hold expired. Please search and book again.', 410);
  }

  const result = await processPayment({ method, amount: booking.totalAmount, details });
  if (!result.success) {
    booking.payment = { method: booking.payment.method, status: 'failed' };
    await booking.save();
    throw new AppError(result.message, 402);
  }

  // atomic confirm: only if still pending and not expired
  const confirmed = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'pending', expiresAt: { $gt: new Date() } },
    { status: 'confirmed', $unset: { expiresAt: 1 }, payment: { method, status: 'paid', transactionId: result.transactionId, paidAt: new Date() } },
    { new: true }
  );
  if (!confirmed) throw new AppError('Room hold expired while paying. Any amount charged will be refunded.', 410);

  const [full, hotel, room] = await Promise.all([
    populateBooking(Booking.findById(confirmed._id)),
    Hotel.findById(confirmed.hotel),
    Room.findById(confirmed.room),
  ]);
  sendEmail(bookingConfirmationEmail(req.user, confirmed, hotel, room));

  res.json({ success: true, message: 'Payment successful. Booking confirmed!', booking: full });
});

// GET /api/bookings/my  - booking history
exports.getMyBookings = asyncHandler(async (req, res) => {
  await releaseExpiredHolds();
  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const bookings = await populateBooking(Booking.find(filter).sort({ createdAt: -1 }));
  res.json({ success: true, count: bookings.length, bookings });
});

// GET /api/bookings/:id  (owner or admin)
exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await populateBooking(Booking.findById(req.params.id)).populate('user', 'name email phone');
  if (!booking) throw new AppError('Booking not found', 404);
  const ownerId = booking.user._id ? String(booking.user._id) : String(booking.user);
  if (req.role !== 'admin' && ownerId !== String(req.user._id)) throw new AppError('Not allowed to view this booking', 403);
  res.json({ success: true, booking });
});

// PUT /api/bookings/:id/cancel  (owner or admin) - guests can cancel until 24 hours before check-in
exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('user', 'name email').populate('hotel', 'name');
  if (!booking) throw new AppError('Booking not found', 404);
  if (req.role !== 'admin' && String(booking.user._id) !== String(req.user._id)) {
    throw new AppError('Not allowed to cancel this booking', 403);
  }
  if (!['pending', 'confirmed'].includes(booking.status)) throw new AppError(`Booking is already ${booking.status.replace('_', ' ')}`, 400);

  // check-in day starts at 00:00 UTC; free cancellation until 24h before that
  if (req.role !== 'admin' && booking.status === 'confirmed' && booking.checkIn.getTime() - Date.now() < DAY) {
    throw new AppError('Bookings can only be cancelled up to 24 hours before check-in', 400);
  }

  const wasPaid = booking.payment.status === 'paid';
  booking.status = 'cancelled';
  booking.expiresAt = undefined;
  if (wasPaid) booking.payment.status = 'refunded'; // simulated refund
  await booking.save();

  sendEmail(bookingCancelledEmail(booking.user, booking, booking.hotel));
  res.json({ success: true, message: wasPaid ? 'Booking cancelled. Refund initiated.' : 'Booking cancelled.', booking });
});

// PUT /api/bookings/:id/checkin   (admin / front desk)
exports.checkIn = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'confirmed') throw new AppError(`Only confirmed bookings can be checked in (this one is ${booking.status.replace('_', ' ')})`, 400);
  if (booking.checkIn > todayUTC()) throw new AppError('Check-in date has not arrived yet', 400);
  booking.status = 'checked_in';
  await booking.save();
  res.json({ success: true, message: 'Guest checked in', booking: await populateBooking(Booking.findById(booking._id)) });
});

// PUT /api/bookings/:id/checkout   (admin / front desk)
exports.checkOut = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('user', 'name email').populate('hotel', 'name');
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'checked_in') throw new AppError('Only checked-in guests can be checked out', 400);
  booking.status = 'checked_out';
  await booking.save();
  sendEmail(checkoutEmail(booking.user, booking, booking.hotel));
  res.json({ success: true, message: 'Guest checked out', booking });
});
