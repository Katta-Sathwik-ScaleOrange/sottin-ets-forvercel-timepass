const router = require('express').Router();
const { getMe, updateMe } = require('../controllers/users.controller');
const { auth } = require('../middleware/auth');

router.get('/me', auth, getMe);
router.patch('/me', auth, updateMe);

module.exports = router;
