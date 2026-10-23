const router = require('express').Router();
const c = require('../controllers/hotelController');
const { protect, optionalAuth, adminOnly } = require('../middleware/authMiddleware');
const validateId = require('../middleware/validateObjectId');

router.get('/', c.getHotels);
router.get('/cities', c.getCities);
router.get('/admin/all', protect, adminOnly, c.getAllHotelsAdmin); // must stay above '/:id'
router.get('/:id', optionalAuth, validateId(), c.getHotel);

router.post('/', protect, adminOnly, c.createHotel);
router.put('/:id', protect, adminOnly, validateId(), c.updateHotel);
router.delete('/:id', protect, adminOnly, validateId(), c.deleteHotel);

module.exports = router;
