const router = require('express').Router();
const c = require('../controllers/bookingController');
const { protect, userOnly, adminOnly } = require('../middleware/authMiddleware');
const validateId = require('../middleware/validateObjectId');

router.use(protect);

router.post('/', userOnly, c.createBooking);
router.get('/my', userOnly, c.getMyBookings); // must stay above '/:id'
router.get('/:id', validateId(), c.getBooking);
router.post('/:id/pay', userOnly, validateId(), c.payForBooking);
router.put('/:id/cancel', validateId(), c.cancelBooking);

// front-desk actions
router.put('/:id/checkin', adminOnly, validateId(), c.checkIn);
router.put('/:id/checkout', adminOnly, validateId(), c.checkOut);

module.exports = router;
