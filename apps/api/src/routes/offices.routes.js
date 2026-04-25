const router = require('express').Router();
const { search, create, update } = require('../controllers/offices.controller');
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

router.get('/search', search);
router.post('/', auth, create);
router.patch('/:id', adminAuth, update);

module.exports = router;
