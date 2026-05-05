const router = require('express').Router();
const {
  getSurveyStats, getODMatrix, getAllRoutes,
  createRoute, addStops, addShift, publishRoute,
  deleteRoute, deleteStop, deleteShift, updateRoute,
  getInventoryAdmin,
  getPendingLocations, updatePendingLocation,
  // Apartments CRUD
  listApartments, createApartment, updateApartment, deleteApartment,
  // Offices CRUD
  listOffices, createOffice, updateOffice, deleteOffice,
} = require('../controllers/admin.controller');
const { adminAuth } = require('../middleware/adminAuth');

// ─── Survey & Analytics ────────────────────────────────────────────────────────
router.get('/survey/stats',     adminAuth, getSurveyStats);
router.get('/survey/od-matrix', adminAuth, getODMatrix);

// ─── Routes & Shifts ──────────────────────────────────────────────────────────
router.get('/routes',                             adminAuth, getAllRoutes);
router.post('/routes',                            adminAuth, createRoute);
router.patch('/routes/:id',                       adminAuth, updateRoute);
router.patch('/routes/:id/publish',               adminAuth, publishRoute);
router.delete('/routes/:id',                      adminAuth, deleteRoute);
router.post('/routes/:id/stops',                  adminAuth, addStops);
router.delete('/routes/:routeId/stops/:stopId',   adminAuth, deleteStop);
router.post('/routes/:id/shifts',                 adminAuth, addShift);
router.delete('/routes/:routeId/shifts/:shiftId', adminAuth, deleteShift);

// ─── Seat Inventory ───────────────────────────────────────────────────────────
router.get('/inventory/:shiftId/:year/:month', adminAuth, getInventoryAdmin);

// ─── Pending GPS Locations ────────────────────────────────────────────────────
router.get('/pending-locations',       adminAuth, getPendingLocations);
router.patch('/pending-locations/:id', adminAuth, updatePendingLocation);

// ─── Apartments CRUD ──────────────────────────────────────────────────────────
router.get('/apartments',        adminAuth, listApartments);
router.post('/apartments',       adminAuth, createApartment);
router.patch('/apartments/:id',  adminAuth, updateApartment);
router.delete('/apartments/:id', adminAuth, deleteApartment);

// ─── Offices CRUD ─────────────────────────────────────────────────────────────
router.get('/offices',        adminAuth, listOffices);
router.post('/offices',       adminAuth, createOffice);
router.patch('/offices/:id',  adminAuth, updateOffice);
router.delete('/offices/:id', adminAuth, deleteOffice);

module.exports = router;
