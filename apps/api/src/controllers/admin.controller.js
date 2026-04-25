const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/admin/survey/stats
exports.getSurveyStats = asyncHandler(async (req, res) => {
  const { rows: total } = await query('SELECT COUNT(*) as count FROM survey_responses');
  
  const { rows: byDay } = await query(
    `SELECT DATE(submitted_at) as date, COUNT(*) as count
     FROM survey_responses
     GROUP BY DATE(submitted_at)
     ORDER BY date DESC
     LIMIT 30`
  );

  const { rows: morningBands } = await query(
    `SELECT morning_band, COUNT(*) as count
     FROM survey_responses
     GROUP BY morning_band
     ORDER BY count DESC`
  );

  const { rows: eveningBands } = await query(
    `SELECT evening_band, COUNT(*) as count
     FROM survey_responses
     GROUP BY evening_band
     ORDER BY count DESC`
  );

  res.json({
    totalResponses: parseInt(total[0].count),
    responsesByDay: byDay,
    morningBands,
    eveningBands,
  });
});

// GET /api/admin/survey/od-matrix
exports.getODMatrix = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM survey_od_matrix');
  res.json(rows);
});

// POST /api/admin/routes
exports.createRoute = asyncHandler(async (req, res) => {
  const { name, origin_area, destination_area } = req.body;

  const { rows } = await query(
    `INSERT INTO routes (name, origin_area, destination_area, status)
     VALUES ($1, $2, $3, 'draft')
     RETURNING *`,
    [name, origin_area, destination_area]
  );

  res.status(201).json(rows[0]);
});

// POST /api/admin/routes/:id/stops
exports.addStops = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stops } = req.body; // [{ stop_type, label, lat, lng, sequence, apartment_id?, office_id? }]

  const results = [];
  for (const stop of stops) {
    const { rows } = await query(
      `INSERT INTO stops (route_id, stop_type, label, lat, lng, sequence, apartment_id, office_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, stop.stop_type, stop.label, stop.lat, stop.lng, stop.sequence, stop.apartment_id, stop.office_id]
    );
    results.push(rows[0]);
  }

  res.status(201).json(results);
});

// POST /api/admin/routes/:id/shifts
exports.addShift = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { direction, departure_time, bus_capacity = 22, label } = req.body;

  const { rows } = await query(
    `INSERT INTO shifts (route_id, direction, departure_time, bus_capacity, label)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, direction, departure_time, bus_capacity, label]
  );

  res.status(201).json(rows[0]);
});

// PATCH /api/admin/routes/:id/publish
exports.publishRoute = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await query(
    `UPDATE routes SET status = 'active' WHERE id = $1 RETURNING *`,
    [id]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Route not found' });
  res.json(rows[0]);
});

// GET /api/admin/routes — all routes including draft (admin only)
exports.getAllRoutes = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT r.*,
       COALESCE(json_agg(DISTINCT jsonb_build_object(
         'id', sh.id, 'direction', sh.direction,
         'departure_time', sh.departure_time, 'label', sh.label,
         'bus_capacity', sh.bus_capacity
       )) FILTER (WHERE sh.id IS NOT NULL), '[]') AS shifts,
       COALESCE(json_agg(DISTINCT jsonb_build_object(
         'id', st.id, 'stop_type', st.stop_type,
         'label', st.label, 'sequence', st.sequence,
         'lat', st.lat, 'lng', st.lng
       )) FILTER (WHERE st.id IS NOT NULL), '[]') AS stops
     FROM routes r
     LEFT JOIN shifts sh ON r.id = sh.route_id
     LEFT JOIN stops st ON r.id = st.route_id
     GROUP BY r.id
     ORDER BY r.created_at DESC`
  );
  res.json(rows);
});

// GET /api/admin/inventory/:shiftId/:year/:month
exports.getInventoryAdmin = asyncHandler(async (req, res) => {
  const { shiftId, year, month } = req.params;

  const { rows } = await query(
    `SELECT si.*, s.label AS shift_label, s.departure_time
     FROM seat_inventory si
     JOIN shifts s ON si.shift_id = s.id
     WHERE si.shift_id = $1
       AND EXTRACT(YEAR FROM si.date) = $2
       AND EXTRACT(MONTH FROM si.date) = $3
     ORDER BY si.date`,
    [shiftId, year, month]
  );

  res.json(rows);
});
