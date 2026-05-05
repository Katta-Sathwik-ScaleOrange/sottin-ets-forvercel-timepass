const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/survey
exports.submit = asyncHandler(async (req, res) => {
  const {
    apartment_id, apartment_name_raw,
    office_id, office_name_raw,
    preferred_days, estimated_days_month,
    morning_band, evening_band,
    data_consent = true
  } = req.body;

  if (!morning_band || !evening_band || !estimated_days_month || !preferred_days?.length) {
    return res.status(400).json({ error: 'Missing required fields: morning_band, evening_band, estimated_days_month, preferred_days' });
  }
  if (!apartment_id && !apartment_name_raw) {
    return res.status(400).json({ error: 'Apartment is required' });
  }
  if (!office_id && !office_name_raw) {
    return res.status(400).json({ error: 'Office is required' });
  }

  const userId = req.user.userId;

  // Auto-create apartment if only raw name provided (no id)
  let resolvedApartmentId = apartment_id || null;
  if (!resolvedApartmentId && apartment_name_raw) {
    try {
      // First check if it already exists
      const { rows: existing } = await query(
        `SELECT id FROM apartments WHERE name ILIKE $1 LIMIT 1`,
        [apartment_name_raw]
      );
      if (existing.length > 0) {
        resolvedApartmentId = existing[0].id;
      } else {
        // Insert with default coords for Tellapur area (will be corrected by admin later)
        const { rows: aptRows } = await query(
          `INSERT INTO apartments (name, area, lat, lng, location, verified, suggested_by)
           VALUES ($1, 'Tellapur', 17.4847, 78.3102,
                   ST_SetSRID(ST_MakePoint(78.3102, 17.4847), 4326)::geography,
                   false, $2)
           RETURNING id`,
          [apartment_name_raw, userId]
        );
        if (aptRows.length > 0) resolvedApartmentId = aptRows[0].id;
      }
    } catch (e) {
      console.warn('Failed to auto-create apartment, proceeding with null id:', e.message);
    }
  }

  // Auto-create office if only raw name provided (no id)
  let resolvedOfficeId = office_id || null;
  if (!resolvedOfficeId && office_name_raw) {
    try {
      // First check if it already exists
      const { rows: existing } = await query(
        `SELECT id FROM offices WHERE name ILIKE $1 LIMIT 1`,
        [office_name_raw]
      );
      if (existing.length > 0) {
        resolvedOfficeId = existing[0].id;
      } else {
        // Insert with default coords for Financial District (will be corrected by admin later)
        const { rows: offRows } = await query(
          `INSERT INTO offices (name, short_name, area, lat, lng, location, source, verified)
           VALUES ($1, $1, 'Financial District', 17.4252, 78.3401,
                   ST_SetSRID(ST_MakePoint(78.3401, 17.4252), 4326)::geography,
                   'manual', false)
           RETURNING id`,
          [office_name_raw]
        );
        if (offRows.length > 0) resolvedOfficeId = offRows[0].id;
      }
    } catch (e) {
      console.warn('Failed to auto-create office, proceeding with null id:', e.message);
    }
  }

  const { rows } = await query(
    `INSERT INTO survey_responses
       (user_id, apartment_id, apartment_name_raw, office_id, office_name_raw,
        preferred_days, estimated_days_month, morning_band, evening_band, data_consent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id) DO UPDATE SET
       apartment_id = EXCLUDED.apartment_id,
       apartment_name_raw = EXCLUDED.apartment_name_raw,
       office_id = EXCLUDED.office_id,
       office_name_raw = EXCLUDED.office_name_raw,
       preferred_days = EXCLUDED.preferred_days,
       estimated_days_month = EXCLUDED.estimated_days_month,
       morning_band = EXCLUDED.morning_band,
       evening_band = EXCLUDED.evening_band,
       data_consent = EXCLUDED.data_consent,
       submitted_at = NOW()
     RETURNING *`,
    [userId, resolvedApartmentId, apartment_name_raw, resolvedOfficeId, office_name_raw,
     preferred_days, estimated_days_month, morning_band, evening_band, Boolean(data_consent)]
  );

  res.status(201).json(rows[0]);
});

// GET /api/survey/me
exports.getMyResponse = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT sr.*, a.name as apartment_name, o.name as office_name
     FROM survey_responses sr
     LEFT JOIN apartments a ON sr.apartment_id = a.id
     LEFT JOIN offices o ON sr.office_id = o.id
     WHERE sr.user_id = $1`,
    [req.user.userId]
  );

  res.json(rows[0] || null);
});
