const Favourite = require('../models/favouriteModel');
const Hotel = require('../models/hotelModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/favourites
exports.getFavourites = asyncHandler(async (req, res) => {
  const favs = await Favourite.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('hotel');
  res.json({ success: true, hotels: favs.map((f) => f.hotel).filter((h) => h && h.isActive) });
});

// POST /api/favourites   body: { hotel }
exports.addFavourite = asyncHandler(async (req, res) => {
  const { hotel } = req.body;
  if (!hotel) throw new AppError('hotel is required', 400);
  if (!(await Hotel.exists({ _id: hotel, isActive: true }))) throw new AppError('Hotel not found', 404);
  await Favourite.updateOne({ user: req.user._id, hotel }, { $setOnInsert: { user: req.user._id, hotel } }, { upsert: true });
  res.status(201).json({ success: true, message: 'Saved to your wishlist' });
});

// DELETE /api/favourites/:hotelId
exports.removeFavourite = asyncHandler(async (req, res) => {
  await Favourite.deleteOne({ user: req.user._id, hotel: req.params.hotelId });
  res.json({ success: true, message: 'Removed from your wishlist' });
});
