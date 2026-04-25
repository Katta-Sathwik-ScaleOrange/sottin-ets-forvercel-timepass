const router = require('express').Router();
const { submit, getMyResponse } = require('../controllers/survey.controller');
const { auth } = require('../middleware/auth');

router.post('/', auth, submit);
router.get('/me', auth, getMyResponse);

module.exports = router;
