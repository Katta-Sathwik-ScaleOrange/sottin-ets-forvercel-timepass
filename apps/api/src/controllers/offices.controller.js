const { query } = require('../config/db');
const { searchGooglePlaces } = require('../services/google-places.service');
const { searchTypesense, indexOffice } = require('../services/typesense.service');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/offices/search?q=amazon
// Strategy: local DB → Typesense → Google Places
exports.search = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (q.length < 2) return res.json([]);

  // 1. Search local DB first (exact/substring matches)
  const { rows: localResults } = await query(
    `SELECT id, name, building_name, short_name, area, lat, lng,
            COALESCE(gates::jsonb, '[]'::jsonb) AS gates,
            verified, selection_count,
            ST_AsGeoJSON(polygon::geometry) AS polygon_geojson,
            osm_id
     FROM offices
     WHERE name ILIKE $1
        OR building_name ILIKE $1
        OR short_name ILIKE $1
        OR $2 = ANY(aliases)
     ORDER BY selection_count DESC, verified DESC
     LIMIT 5`,
    [`%${q}%`, q.toLowerCase()]
  );

  if (localResults.length >= 3) {
    return res.json({ source: 'cache', results: localResults });
  }

  // 2. Typesense fuzzy search
  let combined = [...localResults];
  try {
    const tsResults = await searchTypesense('offices', q);
    if (tsResults && tsResults.length > 0) {
      const tsIds = tsResults.map(ts => ts.id);
      const { rows: tsFullResults } = await query(
        `SELECT id, name, building_name, short_name, area, lat, lng,
                COALESCE(gates::jsonb, '[]'::jsonb) AS gates,
                verified, selection_count,
                ST_AsGeoJSON(polygon::geometry) AS polygon_geojson,
                osm_id
         FROM offices
         WHERE id = ANY($1)`,
        [tsIds]
      );

      tsFullResults.forEach(res => {
        if (!combined.find(r => r.id === res.id)) combined.push(res);
      });
      
      if (combined.length >= 3) return res.json({ source: 'typesense', results: combined });
    }
  } catch (e) {
    console.warn('Typesense search failed:', e.message);
  }

  // 3. Google Places fallback (only if total local results < 3)
  try {
    const placesResults = await searchGooglePlaces(q, {
      location: { lat: 17.42, lng: 78.35 },
      radius: 15000,
      type: 'establishment',
    });
    
    if (placesResults && placesResults.length > 0) {
      placesResults.forEach(pl => {
        // Use name + area for fuzzy duplicate check for Google results
        if (!combined.find(r => r.name === pl.name || r.place_id === pl.place_id)) {
          combined.push(pl);
        }
      });
      return res.json({ source: 'google', results: combined });
    }
    
    return res.json({
      source: 'cache',
      results: combined,
      message: combined.length === 0 ? "Can't find your office? Try again later." : undefined,
    });
  } catch (e) {
    console.warn('Google Places unavailable');
    return res.json({
      source: 'cache',
      results: combined,
      message: combined.length === 0 ? "Can't find your office? Try again later." : undefined,
    });
  }
});

// POST /api/offices
exports.create = asyncHandler(async (req, res) => {
  const { id, name, building_name, short_name, area, lat, lng, place_id, gates = [] } = req.body;

  let office;

  // 1. Try updating by ID first if provided (existing office selected)
  if (id) {
    const { rows: existing } = await query(
      `UPDATE offices SET selection_count = selection_count + 1
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (existing.length > 0) office = existing[0];
  }

  // 2. Then check if office already exists by place_id
  if (!office && place_id) {
    const { rows: existing } = await query(
      `UPDATE offices SET selection_count = selection_count + 1
       WHERE place_id = $1
       RETURNING *`,
      [place_id]
    );
    if (existing.length > 0) office = existing[0];
  }

  // 3. Check by name match as fallback
  if (!office) {
    const { rows: byName } = await query(
      `UPDATE offices SET selection_count = selection_count + 1
       WHERE name ILIKE $1 AND area ILIKE $2
       RETURNING *`,
      [name, `%${area.split(',')[0]}%`]
    );
    if (byName.length > 0) office = byName[0];
  }

  // 4. Insert new office if still not found
  if (!office) {
    const { rows } = await query(
      `INSERT INTO offices (name, building_name, short_name, area, lat, lng, location, place_id, gates, source, selection_count)
       VALUES ($1, $2, $3, $4, $5, $6,
         CASE WHEN $5 IS NOT NULL AND $6 IS NOT NULL
           THEN ST_SetSRID(ST_MakePoint($6::float, $5::float), 4326)::geography
           ELSE NULL END,
         $7, $8, 'google', 1)
       RETURNING *`,
      [name, building_name || null, short_name || name, area, lat || null, lng || null, place_id || null, JSON.stringify(gates)]
    );
    office = rows[0];
  }

  // Re-index in Typesense
  if (office) {
    await indexOffice(office);
  }

  res.status(201).json(office);
});

// PATCH /api/offices/:id
exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, building_name, short_name, aliases, gates, verified } = req.body;

  const { rows } = await query(
    `UPDATE offices
     SET name          = COALESCE($1, name),
         building_name = COALESCE($2, building_name),
         short_name    = COALESCE($3, short_name),
         aliases       = COALESCE($4, aliases),
         gates         = COALESCE($5, gates),
         verified      = COALESCE($6, verified),
         updated_at    = NOW()
     WHERE id = $7
     RETURNING *`,
    [name, building_name, short_name, aliases, gates ? JSON.stringify(gates) : null, verified, id]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Office not found' });
  
  // Update index
  await indexOffice(rows[0]);
  
  res.json(rows[0]);
});
