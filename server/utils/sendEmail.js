const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// Never throws - a failed email must not break a booking.
const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!transporter) {
      console.log(`\n[EMAIL - SMTP not configured] To: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, ' ')}\n`);
      return;
    }
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
  } catch (err) {
    console.error('Email failed:', err.message);
  }
};

const day = (d) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: 'UTC' });

const bookingConfirmationEmail = (user, booking, hotel, room) => ({
  to: user.email,
  subject: `Booking Confirmed - ${hotel.name} (${booking.bookingCode})`,
  html: `
    <h2>Your stay is confirmed 🏨</h2>
    <p>Hi ${user.name},</p>
    <p><b>Booking ID:</b> ${booking.bookingCode}</p>
    <p><b>Hotel:</b> ${hotel.name}, ${hotel.city}${hotel.address ? ` (${hotel.address})` : ''}</p>
    <p><b>Room:</b> ${room.type} - Room ${room.roomNumber}</p>
    <p><b>Check-in:</b> ${day(booking.checkIn)} (from ${hotel.checkInTime})<br/>
    <b>Check-out:</b> ${day(booking.checkOut)} (by ${hotel.checkOutTime})<br/>
    <b>Nights:</b> ${booking.nights} · <b>Guests:</b> ${booking.guests}</p>
    <hr/>
    <p><b>Payment receipt</b></p>
    <p>Room charges: ₹${booking.subtotal}<br/>Tax (12%): ₹${booking.tax}<br/><b>Total paid: ₹${booking.totalAmount}</b><br/>
    Method: ${booking.payment.method} · Transaction ID: ${booking.payment.transactionId}</p>
    <p>We look forward to welcoming you!<br/>- HotelPro</p>`,
});

const bookingCancelledEmail = (user, booking, hotel) => ({
  to: user.email,
  subject: `Booking Cancelled - ${booking.bookingCode}`,
  html: `<p>Hi ${user.name},</p><p>Your booking <b>${booking.bookingCode}</b> at <b>${hotel.name}</b>
  (${day(booking.checkIn)} - ${day(booking.checkOut)}) has been cancelled.
  ${booking.payment.status === 'refunded' ? `A refund of ₹${booking.totalAmount} has been initiated.` : ''}</p><p>- HotelPro</p>`,
});

const checkoutEmail = (user, booking, hotel) => ({
  to: user.email,
  subject: `Thank you for staying at ${hotel.name}`,
  html: `<p>Hi ${user.name},</p><p>Thank you for staying with us (booking <b>${booking.bookingCode}</b>).
  We would love to hear about your stay - please leave a review on HotelPro.</p><p>- ${hotel.name} via HotelPro</p>`,
});

module.exports = { sendEmail, bookingConfirmationEmail, bookingCancelledEmail, checkoutEmail };
