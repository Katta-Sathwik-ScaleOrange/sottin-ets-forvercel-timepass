const router = require('express').Router();
const { getMonthInventory, holdSeats, releaseHold } = require('../controllers/inventory.controller');
const { auth } = require('../middleware/auth');

router.get('/:shiftId/:year/:month', auth, getMonthInventory);
router.post('/hold', auth, holdSeats);
router.delete('/hold', auth, releaseHold);

module.exports = router;
