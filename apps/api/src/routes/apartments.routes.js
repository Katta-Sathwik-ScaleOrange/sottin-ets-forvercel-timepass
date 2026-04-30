const router = require('express').Router();
const { search, detect, getPolygon, suggest } = require('../controllers/apartments.controller');
const { auth } = require('../middleware/auth');

router.get('/search',        search);             // Public — no auth needed
router.get('/detect',        detect);             // Public — GPS detection (saves pending with optional auth)
router.get('/:id/polygon',   getPolygon);         // Public — GeoJSON polygon for Leaflet map
router.post('/suggest',      auth, suggest);      // Authenticated — suggest missing apartment

module.exports = router;
