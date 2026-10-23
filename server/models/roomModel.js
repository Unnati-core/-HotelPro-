const mongoose = require('mongoose');

const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Family', 'Presidential'];

const roomSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    roomNumber: { type: String, required: [true, 'Room number is required'], trim: true },
    type: { type: String, enum: ROOM_TYPES, default: 'Standard' },
    floor: { type: Number, default: 1 },
    pricePerNight: { type: Number, required: [true, 'Price per night is required'], min: 0 },
    capacity: { type: Number, required: true, min: 1, max: 10, default: 2 }, // max guests
    beds: { type: String, trim: true, default: '1 Queen' },
    amenities: { type: [String], default: [] }, // e.g. AC, TV, Mini-bar
    description: { type: String, trim: true, maxlength: 1000 },
    images: { type: [String], default: [] },
    // admin-controlled housekeeping state; "maintenance" rooms cannot be booked
    status: { type: String, enum: ['available', 'maintenance'], default: 'available' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });

const Room = mongoose.model('Room', roomSchema);
Room.ROOM_TYPES = ROOM_TYPES;
module.exports = Room;
