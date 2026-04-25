const router = require('express').Router();
const { createOrder, webhook, getMyBookings } = require('../controllers/bookings.controller');
const { auth } = require('../middleware/auth');

router.post('/', auth, createOrder);
router.post('/webhook', webhook);           // Raw body — no auth
router.get('/me', auth, getMyBookings);

module.exports = router;
