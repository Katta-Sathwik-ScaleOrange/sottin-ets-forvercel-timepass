const router = require('express').Router();
const { getActiveTrip, pingLocation } = require('../controllers/trips.controller');
const { auth } = require('../middleware/auth');

router.get('/active', auth, getActiveTrip);
router.post('/ping', pingLocation);        // Bus device posts GPS

module.exports = router;
