# HotelPro – Hotel Management System (MERN, no TypeScript)

Secure, scalable hotel booking & management: hotels, rooms, date-based availability, payments,
guest accounts, reviews, wishlist, front-desk check-in/out and an admin dashboard.

## 1. Install once
- Node.js 18+  → https://nodejs.org
- MongoDB Community Server → https://www.mongodb.com/try/download/community  (or a free MongoDB Atlas URI)

## 2. Run the backend
```bash
cd HotelPro/server
npm install
# edit .env  (set JWT_SECRET; MONGO_URI is already set for local MongoDB)
npm run seed     # creates admin + 3 sample hotels with rooms
npm run dev      # API on http://localhost:5000
```
Check: open http://localhost:5000/api/health

Admin login (from .env): `admin@hotelpro.com` / `Admin@123`

## 3. Run the frontend (separate terminal - keep the backend running)
```bash
cd HotelPro/client
npm install
npm run dev      # http://localhost:5173
```
The frontend calls `/api/...`; `client/vite.config.js` proxies that to http://localhost:5000, so no CORS setup is needed in development.

Guest pages: `/`, `/hotels/:id`, `/checkout/:id`, `/bookings`, `/wishlist`, `/login`, `/register`
Admin pages: `/admin/login`, `/admin` (dashboard), `/admin/hotels`, `/admin/rooms`, `/admin/bookings`, `/admin/users`

## How booking works
1. Guest searches by city, dates and guests → only hotels with a free room are shown.
2. Guest picks a room → `POST /bookings` **holds** the room for `ROOM_HOLD_MINUTES` (default 10).
3. Guest pays on the checkout page → booking becomes `confirmed` and an email receipt is sent.
4. Front desk marks the guest `checked_in` → `checked_out` (admin → Bookings).
5. After check-out the guest can review the hotel.

Double-booking is prevented by overlap checks (a stay blocks `[checkIn, checkOut)`, so same-day turnover is allowed)
plus a post-insert clash check. Unpaid holds expire automatically. Price = nightly rate × nights + 12% tax.
Guests can cancel free until 24 hours before check-in; admins can cancel anytime (paid bookings are refunded – simulated).

## API summary  (base: /api)
| Area | Endpoints |
|---|---|
| Auth | POST /auth/register, /auth/login, /auth/logout · GET/PUT /auth/me |
| Admin | POST /admin/login · GET /admin/dashboard · GET /admin/users, /admin/users/:id · PUT/DELETE /admin/users/:id · GET /admin/bookings (?status&hotel&user&date) |
| Hotels | GET /hotels (?search&city&stars&minPrice&maxPrice&amenity&checkIn&checkOut&guests&sort&page&limit), GET /hotels/cities, GET /hotels/:id (?checkIn&checkOut&guests → room availability) · admin: GET /hotels/admin/all, POST, PUT, DELETE |
| Rooms | GET /rooms (?hotel&type&status), GET /rooms/:id, GET /rooms/:id/availability · admin: POST, PUT, DELETE |
| Bookings | POST /bookings (hold room) · POST /bookings/:id/pay · GET /bookings/my · GET /bookings/:id · PUT /bookings/:id/cancel · admin: PUT /bookings/:id/checkin, /checkout |
| Reviews | GET /reviews/hotel/:hotelId · POST /reviews · PUT/DELETE /reviews/:id (only after a stay) |
| Wishlist | GET /favourites · POST /favourites {hotel} · DELETE /favourites/:hotelId |

Auth: JWT is set as an httpOnly cookie and also returned in JSON. For Postman use header `Authorization: Bearer <token>`.

Sample booking body: `POST /api/bookings  { "roomId": "...", "checkIn": "2026-11-05", "checkOut": "2026-11-08", "guests": 2 }`

## Project structure
```
HotelPro/
├── server/   config · models (User, Admin, Hotel, Room, Booking, Review, Favourite) · controllers · routes · middleware · utils (seed, payment, email, booking rules)
└── client/   React + Vite · pages (guest + admin) · components · context (auth) · api.js
```
Demo payment gateway is simulated (card numbers ending in `0000` are declined) – swap `server/utils/paymentGateway.js` for Razorpay/Stripe to go live.
