const router = require('express').Router();
const c = require('../controllers/reviewController');
const { protect, userOnly } = require('../middleware/authMiddleware');
const validateId = require('../middleware/validateObjectId');

router.get('/hotel/:hotelId', validateId('hotelId'), c.getHotelReviews);

router.post('/', protect, userOnly, c.createReview);
router.put('/:id', protect, userOnly, validateId(), c.updateReview);
router.delete('/:id', protect, validateId(), c.deleteReview); // owner or admin

module.exports = router;
