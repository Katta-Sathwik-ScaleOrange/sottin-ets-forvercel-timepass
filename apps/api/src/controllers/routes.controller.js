const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/routes — active routes with shifts
exports.getActiveRoutes = asyncHandler(async (_req, res) => {
  const { rows: routes } = await query(
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
     WHERE r.status = 'active'
     GROUP BY r.id
     ORDER BY r.created_at`
  );

  res.json(routes);
});

// GET /api/routes/:id — single route with full details
exports.getRouteById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await query(
    `SELECT r.*,
       json_agg(DISTINCT jsonb_build_object(
         'id', sh.id, 'direction', sh.direction,
         'departure_time', sh.departure_time, 'label', sh.label,
         'bus_capacity', sh.bus_capacity
       )) FILTER (WHERE sh.id IS NOT NULL) AS shifts,
       json_agg(DISTINCT jsonb_build_object(
         'id', st.id, 'stop_type', st.stop_type,
         'label', st.label, 'sequence', st.sequence,
         'lat', st.lat, 'lng', st.lng
       )) FILTER (WHERE st.id IS NOT NULL) AS stops
     FROM routes r
     LEFT JOIN shifts sh ON r.id = sh.route_id
     LEFT JOIN stops st ON r.id = st.route_id
     WHERE r.id = $1
     GROUP BY r.id`,
    [id]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Route not found' });
  res.json(rows[0]);
});
