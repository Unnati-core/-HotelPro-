const mongoose = require('mongoose');

// A guest's wishlist of saved hotels
const favouriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  },
  { timestamps: true }
);

favouriteSchema.index({ user: 1, hotel: 1 }, { unique: true });

module.exports = mongoose.model('Favourite', favouriteSchema);
