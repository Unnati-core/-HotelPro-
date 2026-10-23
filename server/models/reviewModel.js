const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    rating: { type: Number, required: [true, 'Rating is required'], min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// one review per guest per hotel
reviewSchema.index({ user: 1, hotel: 1 }, { unique: true });

// Recalculate the hotel's average rating
reviewSchema.statics.recalculate = async function (hotelId) {
  const [stats] = await this.aggregate([
    { $match: { hotel: new mongoose.Types.ObjectId(hotelId) } },
    { $group: { _id: '$hotel', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await mongoose.model('Hotel').findByIdAndUpdate(hotelId, {
    averageRating: stats ? Math.round(stats.avg * 10) / 10 : 0,
    ratingCount: stats ? stats.count : 0,
  });
};

module.exports = mongoose.model('Review', reviewSchema);
