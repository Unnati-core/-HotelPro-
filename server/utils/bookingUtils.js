const Booking = require('../models/bookingModel');
const AppError = require('./AppError');

const DAY = 24 * 3600 * 1000;
const TAX_RATE = 0.12; // 12% GST

// "2026-11-05" -> Date at 00:00 UTC (all stay dates are whole days)
const parseDay = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const todayUTC = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

// Validates a stay and returns { checkIn, checkOut, nights }. Throws AppError(400) if invalid.
const validateStay = (checkInStr, checkOutStr, { allowPast = false } = {}) => {
  const checkIn = parseDay(checkInStr);
  const checkOut = parseDay(checkOutStr);
  if (!checkIn || !checkOut) throw new AppError('Check-in and check-out dates are required (YYYY-MM-DD)', 400);
  if (!allowPast && checkIn < todayUTC()) throw new AppError('Check-in date cannot be in the past', 400);
  if (checkOut <= checkIn) throw new AppError('Check-out must be after check-in', 400);
  const nights = Math.round((checkOut - checkIn) / DAY);
  if (nights > 30) throw new AppError('You can book at most 30 nights at a time', 400);
  return { checkIn, checkOut, nights };
};

const calcPrice = (pricePerNight, nights) => {
  const subtotal = pricePerNight * nights;
  const tax = Math.round(subtotal * TAX_RATE);
  return { subtotal, tax, totalAmount: subtotal + tax };
};

// Pending holds that ran out of time stop blocking the room
const releaseExpiredHolds = (roomId) => {
  const filter = { status: 'pending', expiresAt: { $lt: new Date() } };
  if (roomId) filter.room = roomId;
  return Booking.updateMany(filter, { status: 'expired', $unset: { expiresAt: 1 } });
};

// Bookings that currently block a room: confirmed, checked in, or an unexpired hold
const blockingFilter = () => ({
  $or: [
    { status: { $in: ['confirmed', 'checked_in'] } },
    { status: 'pending', expiresAt: { $gt: new Date() } },
  ],
});

// Two stays overlap when each starts before the other ends (same-day turnover is allowed)
const overlapFilter = (checkIn, checkOut) => ({ checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } });

// ids of rooms that are NOT free for the given dates
const bookedRoomIds = async (checkIn, checkOut, roomIds) => {
  const filter = { $and: [blockingFilter(), overlapFilter(checkIn, checkOut)] };
  if (roomIds) filter.room = { $in: roomIds };
  const ids = await Booking.distinct('room', filter);
  return ids.map(String);
};

const findConflict = (roomId, checkIn, checkOut, excludeBookingId) => {
  const q = { room: roomId, $and: [blockingFilter(), overlapFilter(checkIn, checkOut)] };
  if (excludeBookingId) q._id = { $ne: excludeBookingId };
  return Booking.findOne(q);
};

module.exports = { DAY, TAX_RATE, parseDay, todayUTC, validateStay, calcPrice, releaseExpiredHolds, blockingFilter, overlapFilter, bookedRoomIds, findConflict };
