const router = require('express').Router();
const { getSurveyStats, getODMatrix, createRoute, addStops, addShift, publishRoute, getInventoryAdmin } = require('../controllers/admin.controller');
const { adminAuth } = require('../middleware/adminAuth');

router.get('/survey/stats', adminAuth, getSurveyStats);
router.get('/survey/od-matrix', adminAuth, getODMatrix);
router.post('/routes', adminAuth, createRoute);
router.post('/routes/:id/stops', adminAuth, addStops);
router.post('/routes/:id/shifts', adminAuth, addShift);
router.patch('/routes/:id/publish', adminAuth, publishRoute);
router.get('/inventory/:shiftId/:year/:month', adminAuth, getInventoryAdmin);

module.exports = router;
