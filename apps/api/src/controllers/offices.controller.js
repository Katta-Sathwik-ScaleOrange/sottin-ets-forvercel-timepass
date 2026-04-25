const { query } = require('../config/db');
const { searchGooglePlaces } = require('../services/google-places.service');
const { searchTypesense } = require('../services/typesense.service');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/offices/search?q=amazon
// Strategy: local DB → Typesense → Google Places
exports.search = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (q.length < 2) return res.json([]);

  // 1. Search local DB first (cached offices)
  const { rows: localResults } = await query(
    `SELECT id, name, short_name, area, lat, lng, gates, verified, selection_count
     FROM offices
     WHERE name ILIKE $1 OR short_name ILIKE $1 OR $2 = ANY(aliases)
     ORDER BY selection_count DESC, verified DESC
     LIMIT 5`,
    [`%${q}%`, q.toLowerCase()]
  );

  if (localResults.length >= 3) {
    return res.json({ source: 'cache', results: localResults });
  }

  // 2. Typesense fuzzy search
  try {
    const tsResults = await searchTypesense('offices', q);
    if (tsResults && tsResults.length > 0) {
      // Combine local and typesense results, filtering duplicates by name
      const combined = [...localResults];
      tsResults.forEach(ts => {
        if (!combined.find(r => r.name === ts.name)) combined.push(ts);
      });
      if (combined.length >= 3) return res.json({ source: 'typesense', results: combined });
    }
  } catch (e) {
    console.warn('Typesense unavailable, falling back to Google Places');
  }

  // 3. Google Places fallback
  try {
    const placesResults = await searchGooglePlaces(q, {
      location: { lat: 17.42, lng: 78.35 },
      radius: 15000,
      type: 'establishment',
    });
    
    if (placesResults && placesResults.length > 0) {
      const combined = [...localResults];
      placesResults.forEach(pl => {
        if (!combined.find(r => r.name === pl.name)) combined.push(pl);
      });
      return res.json({ source: 'google', results: combined });
    }
    
    // If Google Places returns nothing, fallback to whatever we found locally
    return res.json({
      source: 'cache',
      results: localResults,
      message: localResults.length === 0 ? "Can't find your office? Try again later." : undefined,
    });
  } catch (e) {
    console.warn('Google Places unavailable');
    return res.json({
      source: 'cache',
      results: localResults,
      message: localResults.length === 0 ? "Can't find your office? Try again later." : undefined,
    });
  }
});

// POST /api/offices
// Body: { name, short_name, area, lat, lng, place_id, gates }
// Called when user selects a Google Places result to cache it
exports.create = asyncHandler(async (req, res) => {
  const { name, short_name, area, lat, lng, place_id, gates = [] } = req.body;

  const { rows } = await query(
    `INSERT INTO offices (name, short_name, area, lat, lng, location, place_id, gates, source)
     VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6, $7, 'google')
     ON CONFLICT (place_id) DO UPDATE
       SET selection_count = offices.selection_count + 1
     RETURNING *`,
    [name, short_name, area, lat, lng, place_id, JSON.stringify(gates)]
  );

  res.status(201).json(rows[0]);
});

// PATCH /api/offices/:id — Admin: verify and enrich office data
exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, short_name, aliases, gates, verified } = req.body;

  const { rows } = await query(
    `UPDATE offices
     SET name = COALESCE($1, name),
         short_name = COALESCE($2, short_name),
         aliases = COALESCE($3, aliases),
         gates = COALESCE($4, gates),
         verified = COALESCE($5, verified)
     WHERE id = $6
     RETURNING *`,
    [name, short_name, aliases, gates ? JSON.stringify(gates) : null, verified, id]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Office not found' });
  res.json(rows[0]);
});
