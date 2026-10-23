const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    checkIn: { type: Date, required: true },  // stored as UTC midnight of the day
    checkOut: { type: Date, required: true }, // guest leaves on this day (night is NOT charged)
    nights: { type: Number, required: true, min: 1 },
    guests: { type: Number, required: true, min: 1 },
    specialRequests: { type: String, trim: true, maxlength: 500 },
    pricePerNight: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    // pending = room held awaiting payment
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired'],
      default: 'pending',
    },
    expiresAt: { type: Date },
    payment: {
      method: { type: String, enum: ['card', 'upi', 'netbanking', 'wallet'] },
      status: { type: String, enum: ['unpaid', 'paid', 'failed', 'refunded'], default: 'unpaid' },
      transactionId: String,
      paidAt: Date,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });

bookingSchema.pre('validate', function (next) {
  if (!this.bookingCode) {
    this.bookingCode = 'HP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
