const Review = require('../models/reviewModel');
const Booking = require('../models/bookingModel');
const Hotel = require('../models/hotelModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/reviews/hotel/:hotelId
exports.getHotelReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ hotel: req.params.hotelId }).sort({ createdAt: -1 }).populate('user', 'name');
  res.json({ success: true, count: reviews.length, reviews });
});

// POST /api/reviews   body: { hotel, rating, comment }  - only guests who actually stayed
exports.createReview = asyncHandler(async (req, res) => {
  const { hotel, rating, comment } = req.body;
  if (!hotel) throw new AppError('hotel is required', 400);
  if (!(await Hotel.exists({ _id: hotel }))) throw new AppError('Hotel not found', 404);

  const stayed = await Booking.exists({
    user: req.user._id, hotel,
    $or: [{ status: 'checked_out' }, { status: { $in: ['confirmed', 'checked_in'] }, checkOut: { $lte: new Date() } }],
  });
  if (!stayed) throw new AppError('You can review a hotel only after your stay', 403);

  if (await Review.exists({ user: req.user._id, hotel })) throw new AppError('You have already reviewed this hotel. Edit your review instead.', 409);

  const review = await Review.create({ user: req.user._id, hotel, rating, comment });
  await Review.recalculate(hotel);
  res.status(201).json({ success: true, review });
});

// PUT /api/reviews/:id
exports.updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) throw new AppError('Review not found', 404);
  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  await review.save();
  await Review.recalculate(review.hotel);
  res.json({ success: true, review });
});

// DELETE /api/reviews/:id  (owner or admin)
exports.deleteReview = asyncHandler(async (req, res) => {
  const filter = req.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, user: req.user._id };
  const review = await Review.findOne(filter);
  if (!review) throw new AppError('Review not found', 404);
  await review.deleteOne();
  await Review.recalculate(review.hotel);
  res.json({ success: true, message: 'Review deleted' });
});
