const router = require('express').Router();
const { googleLogin, refreshToken, logout } = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');

router.post('/google', googleLogin);
router.post('/refresh', refreshToken);
router.post('/logout', auth, logout);

module.exports = router;
