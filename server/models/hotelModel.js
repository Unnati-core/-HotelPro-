const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Hotel name is required'], trim: true, maxlength: 120 },
    city: { type: String, required: [true, 'City is required'], trim: true },
    address: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 3000 },
    images: { type: [String], default: [] },
    amenities: { type: [String], default: [] }, // e.g. WiFi, Pool, Parking
    starRating: { type: Number, min: 1, max: 5, default: 3 },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    checkInTime: { type: String, default: '14:00' },
    checkOutTime: { type: String, default: '11:00' },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

hotelSchema.index({ name: 'text', city: 'text' });

module.exports = mongoose.model('Hotel', hotelSchema);
