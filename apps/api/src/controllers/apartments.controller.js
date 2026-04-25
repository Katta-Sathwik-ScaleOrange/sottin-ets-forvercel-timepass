const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/apartments/search?q=aliens
exports.search = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (q.length < 2) return res.json([]);

  const { rows } = await query(
    `SELECT id, name, area, lat, lng, aliases, verified
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

// POST /api/apartments/suggest
// Body: { name, area, lat, lng }
exports.suggest = asyncHandler(async (req, res) => {
  const { name, area, lat, lng } = req.body;
  const userId = req.user.userId;

  const { rows } = await query(
    `INSERT INTO apartments (name, area, lat, lng, location, verified, suggested_by)
     VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326), false, $5)
     ON CONFLICT DO NOTHING
     RETURNING id, name, area`,
    [name, area || 'Tellapur', lat || 17.456, lng || 78.321, userId]
  );

  res.status(201).json(rows[0] || { message: 'Already exists or queued for review' });
});
