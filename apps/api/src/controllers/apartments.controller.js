const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/apartments/search?q=aliens
exports.search = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (q.length < 2) return res.json([]);

  const { rows } = await query(
    `SELECT id, name, area, lat, lng, aliases, verified,
            ST_AsGeoJSON(polygon) AS polygon_geojson,
            osm_id
     FROM apartments
     WHERE name ILIKE $1
        OR $2 = ANY(aliases)
        OR similarity(name, $3) > 0.2
     ORDER BY verified DESC, similarity(name, $3) DESC
     LIMIT 10`,
    [`%${q}%`, q.toLowerCase(), q]
  );

  res.json(rows);
});

// GET /api/apartments/detect?lat=17.456&lng=78.321
// GPS-based apartment detection using PostGIS ST_Within on polygon column.
// If no match, saves coordinates to pending_locations and returns { match: null, pendingId }
exports.detect = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' });
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (isNaN(latNum) || isNaN(lngNum)) {
    return res.status(400).json({ error: 'lat and lng must be valid numbers' });
  }

  // Try to find an apartment whose polygon contains this GPS point
  const { rows: matchRows } = await query(
    `SELECT id, name, area, lat, lng, verified,
            ST_AsGeoJSON(polygon::geometry) AS polygon_geojson,
            osm_id
     FROM apartments
     WHERE polygon IS NOT NULL
       AND ST_Within(
         ST_SetSRID(ST_MakePoint($1, $2), 4326),
         polygon::geometry
       )
     LIMIT 1`,
    [lngNum, latNum]
  );

  if (matchRows.length > 0) {
    return res.json({ match: matchRows[0], pendingId: null });
  }

  // No polygon match — try nearest apartment within 200m as a fallback hint
  const { rows: nearbyRows } = await query(
    `SELECT id, name, area, lat, lng,
            ST_AsGeoJSON(polygon::geometry) AS polygon_geojson,
            ST_Distance(
              location,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) AS distance_m
     FROM apartments
     WHERE location IS NOT NULL
     ORDER BY distance_m ASC
     LIMIT 3`,
    [lngNum, latNum]
  );

  // Save GPS hit to pending_locations for admin review
  let pendingId = null;
  try {
    const userId = req.user?.userId || null;
    const { rows: pendingRows } = await query(
      `INSERT INTO pending_locations (lat, lng, user_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [latNum, lngNum, userId]
    );
    pendingId = pendingRows[0]?.id || null;
  } catch (e) {
    console.warn('Could not save pending location:', e.message);
  }

  return res.json({
    match: null,
    pendingId,
    nearby: nearbyRows,   // return nearby apartments so user can pick manually
    message: "Your location didn't match any apartment in our database. We've noted it for review.",
  });
});

// GET /api/apartments/:id/polygon
// Returns GeoJSON polygon for a specific apartment (for Leaflet map rendering)
exports.getPolygon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await query(
    `SELECT id, name, area,
            ST_AsGeoJSON(polygon::geometry) AS polygon_geojson,
            lat, lng
     FROM apartments
     WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Apartment not found' });

  const apt = rows[0];
  res.json({
    id: apt.id,
    name: apt.name,
    area: apt.area,
    lat: apt.lat,
    lng: apt.lng,
    polygon_geojson: apt.polygon_geojson ? JSON.parse(apt.polygon_geojson) : null,
  });
});

// POST /api/apartments/suggest
// Body: { name, area, lat, lng, pendingId? }
exports.suggest = asyncHandler(async (req, res) => {
  const { name, area, lat, lng, pendingId } = req.body;
  const userId = req.user.userId;

  const { rows } = await query(
    `INSERT INTO apartments (name, aliases, area, lat, lng, location, verified, suggested_by)
     VALUES ($1, '{}', $2, $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, false, $5)
     RETURNING id, name, area`,
    [name, area || 'Tellapur', parseFloat(lat) || 17.4847, parseFloat(lng) || 78.3102, userId]
  );

  // If user got a pendingId from GPS detect, update the pending location with their suggested name
  if (pendingId) {
    try {
      await query(
        `UPDATE pending_locations
         SET suggested_name = $1, status = 'reviewed'
         WHERE id = $2`,
        [name, pendingId]
      );
    } catch (e) {
      console.warn('Could not update pending location name:', e.message);
    }
  }

  res.status(201).json(rows[0] || { message: 'Already exists or queued for review' });
});
