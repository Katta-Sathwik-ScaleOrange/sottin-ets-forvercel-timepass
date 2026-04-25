const router = require('express').Router();
const { search, suggest } = require('../controllers/apartments.controller');
const { auth } = require('../middleware/auth');

router.get('/search', search);           // Public — no auth needed
router.post('/suggest', auth, suggest);  // Authenticated — suggest missing apt

module.exports = router;
