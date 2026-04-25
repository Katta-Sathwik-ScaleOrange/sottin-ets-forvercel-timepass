const router = require('express').Router();
const { getActiveRoutes, getRouteById } = require('../controllers/routes.controller');
const { auth } = require('../middleware/auth');

router.get('/', auth, getActiveRoutes);
router.get('/:id', auth, getRouteById);

module.exports = router;
