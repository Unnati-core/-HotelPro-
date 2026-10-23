// npm run seed  -> creates the admin account + sample hotels and rooms
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/adminModel');
const Hotel = require('../models/hotelModel');
const Room = require('../models/roomModel');

const makeRooms = (hotel, floors, perFloor, base) => {
  const types = [
    { type: 'Standard', mult: 1, capacity: 2, beds: '1 Queen', amenities: ['AC', 'TV', 'WiFi'] },
    { type: 'Deluxe', mult: 1.5, capacity: 3, beds: '1 King', amenities: ['AC', 'TV', 'WiFi', 'Mini-bar'] },
    { type: 'Suite', mult: 2.5, capacity: 4, beds: '1 King + Sofa bed', amenities: ['AC', 'TV', 'WiFi', 'Mini-bar', 'Bathtub'] },
  ];
  const rooms = [];
  for (let f = 1; f <= floors; f++) {
    for (let n = 1; n <= perFloor; n++) {
      const t = types[(f + n) % types.length];
      rooms.push({
        hotel: hotel._id, roomNumber: `${f}0${n}`, floor: f, type: t.type, capacity: t.capacity, beds: t.beds,
        amenities: t.amenities, pricePerNight: Math.round((base * t.mult) / 50) * 50,
        description: `${t.type} room on floor ${f}.`,
      });
    }
  }
  return rooms;
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  if (!(await Admin.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() }))) {
    await Admin.create({ name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
    console.log(`Admin created: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`);
  } else console.log('Admin already exists');

  if (!(await Hotel.countDocuments())) {
    const hotels = await Hotel.insertMany([
      { name: 'HotelPro Grand', city: 'Indore', address: 'MG Road', starRating: 5, description: 'A luxury city hotel with a rooftop pool, spa and fine dining.', amenities: ['WiFi', 'Pool', 'Spa', 'Parking', 'Restaurant', 'Gym'], contactPhone: '+91 731 000 1111', contactEmail: 'grand@hotelpro.com' },
      { name: 'HotelPro Residency', city: 'Bhopal', address: 'Arera Colony', starRating: 4, description: 'Comfortable business hotel close to the lakes and the railway station.', amenities: ['WiFi', 'Parking', 'Restaurant', 'Conference Hall'], contactPhone: '+91 755 000 2222', contactEmail: 'residency@hotelpro.com' },
      { name: 'HotelPro Inn', city: 'Ujjain', address: 'Freeganj', starRating: 3, description: 'Budget-friendly stay near Mahakaleshwar Temple with clean, simple rooms.', amenities: ['WiFi', 'Parking', 'Restaurant'], contactPhone: '+91 734 000 3333', contactEmail: 'inn@hotelpro.com' },
    ]);
    await Room.insertMany([
      ...makeRooms(hotels[0], 3, 4, 4000),
      ...makeRooms(hotels[1], 2, 4, 2800),
      ...makeRooms(hotels[2], 2, 3, 1500),
    ]);
    console.log('Sample hotels and rooms created');
  } else console.log('Data already present, skipping samples');

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
