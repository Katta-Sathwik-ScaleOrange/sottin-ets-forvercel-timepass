const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/survey
exports.submit = asyncHandler(async (req, res) => {
  const {
    apartment_id, apartment_name_raw,
    office_id, office_name_raw,
    preferred_days, estimated_days_month,
    morning_band, evening_band
  } = req.body;

  const userId = req.user.userId;

  const { rows } = await query(
    `INSERT INTO survey_responses
       (user_id, apartment_id, apartment_name_raw, office_id, office_name_raw,
        preferred_days, estimated_days_month, morning_band, evening_band)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (user_id) DO UPDATE SET
       apartment_id = EXCLUDED.apartment_id,
       apartment_name_raw = EXCLUDED.apartment_name_raw,
       office_id = EXCLUDED.office_id,
       office_name_raw = EXCLUDED.office_name_raw,
       preferred_days = EXCLUDED.preferred_days,
       estimated_days_month = EXCLUDED.estimated_days_month,
       morning_band = EXCLUDED.morning_band,
       evening_band = EXCLUDED.evening_band,
       submitted_at = NOW()
     RETURNING *`,
    [userId, apartment_id, apartment_name_raw, office_id, office_name_raw,
     preferred_days, estimated_days_month, morning_band, evening_band]
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
