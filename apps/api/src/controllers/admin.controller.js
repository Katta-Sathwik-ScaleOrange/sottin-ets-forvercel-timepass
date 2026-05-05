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
      `INSERT INTO stops (route_id, stop_type, label, lat, lng, sequence, apartment_id, office_id, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
               ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography)
       RETURNING *`,
      [id, stop.stop_type, stop.label,
       parseFloat(stop.lat), parseFloat(stop.lng),
       stop.sequence,
       stop.apartment_id || null, stop.office_id || null]
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

  // Cast date to text to avoid pg driver UTC-offset serialization bug
  // (DATE columns arrive as JS Date objects with midnight UTC, causing
  //  off-by-one day errors in IST and other UTC+ timezones)
  const { rows } = await query(
    `SELECT si.id, si.shift_id,
            to_char(si.date, 'YYYY-MM-DD') AS date,
            si.seats_total, si.seats_booked, si.seats_held,
            s.label AS shift_label, s.departure_time
     FROM seat_inventory si
     JOIN shifts s ON si.shift_id = s.id
     WHERE si.shift_id = $1
       AND EXTRACT(YEAR FROM si.date) = $2
       AND EXTRACT(MONTH FROM si.date) = $3
     ORDER BY si.date`,
    [shiftId, parseInt(year), parseInt(month)]
  );

  res.json(rows);
});

// GET /api/admin/pending-locations
// Returns all GPS hits that didn't match any apartment polygon, for admin review
exports.getPendingLocations = asyncHandler(async (req, res) => {
  const { status = 'pending', limit = 50, offset = 0 } = req.query;

  const { rows } = await query(
    `SELECT pl.*,
            u.name  AS user_name,
            u.email AS user_email,
            a.name  AS merged_apartment_name
     FROM pending_locations pl
     LEFT JOIN users u ON pl.user_id = u.id
     LEFT JOIN apartments a ON pl.merged_into = a.id
     WHERE pl.status = $1
     ORDER BY pl.created_at DESC
     LIMIT $2 OFFSET $3`,
    [status, parseInt(limit), parseInt(offset)]
  );

  const { rows: countRows } = await query(
    'SELECT COUNT(*) AS total FROM pending_locations WHERE status = $1',
    [status]
  );

  res.json({
    items: rows,
    total: parseInt(countRows[0].total),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

// PATCH /api/admin/pending-locations/:id
// Actions: merge (link to existing apartment) | reject | reviewed
exports.updatePendingLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, apartment_id, suggested_name } = req.body;
  // action: 'merge' | 'reject' | 'reviewed'

  if (!['merge', 'reject', 'reviewed'].includes(action)) {
    return res.status(400).json({ error: 'action must be merge | reject | reviewed' });
  }

  let updateSql, updateParams;

  if (action === 'merge') {
    if (!apartment_id) return res.status(400).json({ error: 'apartment_id required for merge action' });
    updateSql = `UPDATE pending_locations
                 SET status = 'merged', merged_into = $1
                 WHERE id = $2 RETURNING *`;
    updateParams = [apartment_id, id];
  } else if (action === 'reject') {
    updateSql = `UPDATE pending_locations SET status = 'rejected' WHERE id = $1 RETURNING *`;
    updateParams = [id];
  } else {
    updateSql = `UPDATE pending_locations
                 SET status = 'reviewed',
                     suggested_name = COALESCE($1, suggested_name)
                 WHERE id = $2 RETURNING *`;
    updateParams = [suggested_name || null, id];
  }

  const { rows } = await query(updateSql, updateParams);
  if (rows.length === 0) return res.status(404).json({ error: 'Pending location not found' });
  res.json(rows[0]);
});

// DELETE /api/admin/routes/:id
exports.deleteRoute = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows: used } = await query(
    `SELECT COUNT(*) AS c FROM bookings b
     JOIN shifts s ON b.onward_shift_id = s.id
     WHERE s.route_id = $1 AND b.status = 'confirmed'`,
    [id]
  );
  if (parseInt(used[0].c) > 0) {
    return res.status(409).json({ error: `Cannot delete: route has ${used[0].c} confirmed booking(s).` });
  }

  await query('DELETE FROM stops WHERE route_id = $1', [id]);
  await query('DELETE FROM shifts WHERE route_id = $1', [id]);
  const { rows } = await query('DELETE FROM routes WHERE id = $1 RETURNING id, name', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Route not found' });
  res.json({ deleted: true, ...rows[0] });
});

// DELETE /api/admin/routes/:routeId/stops/:stopId
exports.deleteStop = asyncHandler(async (req, res) => {
  const { routeId, stopId } = req.params;
  const { rows } = await query(
    'DELETE FROM stops WHERE id = $1 AND route_id = $2 RETURNING id, label',
    [stopId, routeId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Stop not found' });
  res.json({ deleted: true, ...rows[0] });
});

// DELETE /api/admin/routes/:routeId/shifts/:shiftId
exports.deleteShift = asyncHandler(async (req, res) => {
  const { routeId, shiftId } = req.params;

  const { rows: used } = await query(
    `SELECT COUNT(*) AS c FROM bookings WHERE onward_shift_id = $1 AND status = 'confirmed'`,
    [shiftId]
  );
  if (parseInt(used[0].c) > 0) {
    return res.status(409).json({ error: `Cannot delete: shift has ${used[0].c} confirmed booking(s).` });
  }

  const { rows } = await query(
    'DELETE FROM shifts WHERE id = $1 AND route_id = $2 RETURNING id, label',
    [shiftId, routeId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Shift not found' });
  res.json({ deleted: true, ...rows[0] });
});

// PATCH /api/admin/routes/:id — update status (pause/retire/draft)
exports.updateRoute = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, name, origin_area, destination_area } = req.body;

  const allowed = ['draft', 'active', 'paused', 'retired'];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  const { rows: existing } = await query('SELECT * FROM routes WHERE id = $1', [id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Route not found' });
  const r = existing[0];

  const { rows } = await query(
    `UPDATE routes SET
       name = $1, origin_area = $2, destination_area = $3, status = $4
     WHERE id = $5 RETURNING *`,
    [
      name ?? r.name,
      origin_area ?? r.origin_area,
      destination_area ?? r.destination_area,
      status ?? r.status,
      id,
    ]
  );
  res.json(rows[0]);
});

// ============================================================
// APARTMENTS CRUD
// ============================================================

// GET /api/admin/apartments?search=&limit=20&offset=0
exports.listApartments = asyncHandler(async (req, res) => {
  const { search = '', limit = 20, offset = 0 } = req.query;
  const searchPat = `%${search}%`;

  const { rows } = await query(
    `SELECT a.*,
            ST_AsGeoJSON(a.polygon) AS polygon_geojson,
            (a.polygon IS NOT NULL)  AS has_polygon
     FROM apartments a
     WHERE ($1 = '' OR a.name ILIKE $1 OR a.area ILIKE $1)
     ORDER BY a.verified DESC, a.name ASC
     LIMIT $2 OFFSET $3`,
    [searchPat, parseInt(limit), parseInt(offset)]
  );

  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN verified THEN 1 ELSE 0 END)      AS verified_count,
            SUM(CASE WHEN polygon IS NOT NULL THEN 1 ELSE 0 END) AS polygon_count
     FROM apartments
     WHERE ($1 = '' OR name ILIKE $1 OR area ILIKE $1)`,
    [searchPat]
  );

  res.json({
    apartments: rows,
    total:         parseInt(countRows[0].total),
    verifiedCount: parseInt(countRows[0].verified_count),
    polygonCount:  parseInt(countRows[0].polygon_count),
    limit:  parseInt(limit),
    offset: parseInt(offset),
  });
});

// POST /api/admin/apartments
exports.createApartment = asyncHandler(async (req, res) => {
  const { name, area, lat, lng, aliases = [], verified = false } = req.body;
  if (!name || !area || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, area, lat, lng are required' });
  }

  const { rows } = await query(
    `INSERT INTO apartments (name, area, lat, lng, aliases, verified,
                             location)
     VALUES ($1, $2, $3, $4, $5, $6,
             ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography)
     RETURNING *`,
    [name, area, parseFloat(lat), parseFloat(lng),
     Array.isArray(aliases) ? aliases : aliases.split(',').map(s => s.trim()).filter(Boolean),
     Boolean(verified)]
  );

  res.status(201).json(rows[0]);
});

// PATCH /api/admin/apartments/:id
exports.updateApartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, area, lat, lng, aliases, verified } = req.body;

  const { rows: existing } = await query('SELECT * FROM apartments WHERE id = $1', [id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Apartment not found' });

  const apt = existing[0];
  const newName     = name     ?? apt.name;
  const newArea     = area     ?? apt.area;
  const newLat      = lat      != null ? parseFloat(lat)  : apt.lat;
  const newLng      = lng      != null ? parseFloat(lng)  : apt.lng;
  const newAliases  = aliases  != null
    ? (Array.isArray(aliases) ? aliases : aliases.split(',').map(s => s.trim()).filter(Boolean))
    : apt.aliases;
  const newVerified = verified != null ? Boolean(verified) : apt.verified;

  const { rows } = await query(
    `UPDATE apartments
     SET name = $1, area = $2, lat = $3, lng = $4,
         aliases = $5, verified = $6,
         location = ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography
     WHERE id = $7
     RETURNING *`,
    [newName, newArea, newLat, newLng, newAliases, newVerified, id]
  );

  res.json(rows[0]);
});

// DELETE /api/admin/apartments/:id
exports.deleteApartment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Safety check: don't delete if used in survey responses
  const { rows: used } = await query(
    'SELECT COUNT(*) AS c FROM survey_responses WHERE apartment_id = $1', [id]
  );
  if (parseInt(used[0].c) > 0) {
    return res.status(409).json({
      error: `Cannot delete: apartment is used in ${used[0].c} survey response(s). Deactivate instead.`
    });
  }

  const { rows } = await query('DELETE FROM apartments WHERE id = $1 RETURNING id, name', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Apartment not found' });
  res.json({ deleted: true, ...rows[0] });
});

// ============================================================
// OFFICES CRUD
// ============================================================

// GET /api/admin/offices?search=&limit=20&offset=0
exports.listOffices = asyncHandler(async (req, res) => {
  const { search = '', limit = 20, offset = 0 } = req.query;
  const searchPat = `%${search}%`;

  const { rows } = await query(
    `SELECT o.*,
            ST_AsGeoJSON(o.polygon) AS polygon_geojson,
            (o.polygon IS NOT NULL)  AS has_polygon
     FROM offices o
     WHERE ($1 = '' OR o.name ILIKE $1 OR o.area ILIKE $1
            OR o.building_name ILIKE $1 OR o.short_name ILIKE $1)
     ORDER BY o.verified DESC, o.selection_count DESC, o.name ASC
     LIMIT $2 OFFSET $3`,
    [searchPat, parseInt(limit), parseInt(offset)]
  );

  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN verified THEN 1 ELSE 0 END)           AS verified_count,
            SUM(CASE WHEN polygon IS NOT NULL THEN 1 ELSE 0 END) AS polygon_count
     FROM offices
     WHERE ($1 = '' OR name ILIKE $1 OR area ILIKE $1
            OR building_name ILIKE $1 OR short_name ILIKE $1)`,
    [searchPat]
  );

  res.json({
    offices:       rows,
    total:         parseInt(countRows[0].total),
    verifiedCount: parseInt(countRows[0].verified_count),
    polygonCount:  parseInt(countRows[0].polygon_count),
    limit:  parseInt(limit),
    offset: parseInt(offset),
  });
});

// POST /api/admin/offices
exports.createOffice = asyncHandler(async (req, res) => {
  const {
    name, short_name = null, area, lat, lng,
    aliases = [], building_name = null, gates = [],
    verified = false, source = 'manual'
  } = req.body;

  if (!name || !area || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, area, lat, lng are required' });
  }

  const aliasArr = Array.isArray(aliases)
    ? aliases
    : (aliases ? aliases.split(',').map(s => s.trim()).filter(Boolean) : []);

  const gatesJson = typeof gates === 'string' ? gates : JSON.stringify(gates);

  const { rows } = await query(
    `INSERT INTO offices
       (name, short_name, area, lat, lng, aliases, building_name,
        gates, verified, source, selection_count,
        location)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,
             ST_SetSRID(ST_MakePoint($5::float, $4::float), 4326)::geography)
     RETURNING *`,
    [name, short_name, area, parseFloat(lat), parseFloat(lng),
     aliasArr, building_name, gatesJson, Boolean(verified), source]
  );

  res.status(201).json(rows[0]);
});

// PATCH /api/admin/offices/:id
exports.updateOffice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, short_name, area, lat, lng, aliases, building_name, gates, verified } = req.body;

  const { rows: existing } = await query('SELECT * FROM offices WHERE id = $1', [id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Office not found' });

  const o = existing[0];
  const newName     = name          ?? o.name;
  const newShort    = short_name    !== undefined ? short_name    : o.short_name;
  const newArea     = area          ?? o.area;
  const newLat      = lat  != null  ? parseFloat(lat)  : o.lat;
  const newLng      = lng  != null  ? parseFloat(lng)  : o.lng;
  const newBldg     = building_name !== undefined ? building_name : o.building_name;
  const newAliases  = aliases != null
    ? (Array.isArray(aliases) ? aliases : aliases.split(',').map(s => s.trim()).filter(Boolean))
    : o.aliases;
  const newGates    = gates !== undefined
    ? (typeof gates === 'string' ? gates : JSON.stringify(gates))
    : JSON.stringify(o.gates);
  const newVerified = verified != null ? Boolean(verified) : o.verified;

  const { rows } = await query(
    `UPDATE offices
     SET name = $1, short_name = $2, area = $3, lat = $4, lng = $5,
         aliases = $6, building_name = $7, gates = $8, verified = $9,
         location = ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography
     WHERE id = $10
     RETURNING *`,
    [newName, newShort, newArea, newLat, newLng,
     newAliases, newBldg, newGates, newVerified, id]
  );

  res.json(rows[0]);
});

// DELETE /api/admin/offices/:id
exports.deleteOffice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Safety: don't delete if used in survey responses
  const { rows: used } = await query(
    'SELECT COUNT(*) AS c FROM survey_responses WHERE office_id = $1', [id]
  );
  if (parseInt(used[0].c) > 0) {
    return res.status(409).json({
      error: `Cannot delete: office is used in ${used[0].c} survey response(s).`
    });
  }

  const { rows } = await query('DELETE FROM offices WHERE id = $1 RETURNING id, name', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Office not found' });
  res.json({ deleted: true, ...rows[0] });
});
