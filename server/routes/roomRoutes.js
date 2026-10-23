const router = require('express').Router();
const c = require('../controllers/roomController');
const { protect, optionalAuth, adminOnly } = require('../middleware/authMiddleware');
const validateId = require('../middleware/validateObjectId');

router.get('/', optionalAuth, c.getRooms);
router.get('/:id', validateId(), c.getRoom);
router.get('/:id/availability', validateId(), c.getAvailability);

router.post('/', protect, adminOnly, c.createRoom);
router.put('/:id', protect, adminOnly, validateId(), c.updateRoom);
router.delete('/:id', protect, adminOnly, validateId(), c.deleteRoom);

module.exports = router;
