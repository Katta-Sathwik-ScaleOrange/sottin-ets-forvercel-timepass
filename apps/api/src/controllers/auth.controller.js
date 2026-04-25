const { OAuth2Client } = require('google-auth-library');
const { query } = require('../config/db');
const { signToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
// Body: { credential: <google_id_token> }
exports.googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'credential required' });

  // Verify Google token
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub: googleId, name, email, picture } = payload;

  // Upsert user
  const { rows } = await query(
    `INSERT INTO users (google_id, name, email, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE
       SET name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
     RETURNING *`,
    [googleId, name, email, picture]
  );

  const user = rows[0];
  const token = signToken({ userId: user.id, role: user.role });

  // Check if user has completed survey (for frontend routing)
  const surveyResult = await query(
    'SELECT id FROM survey_responses WHERE user_id = $1',
    [user.id]
  );

  // Check if user has any confirmed bookings (for stage 3)
  const bookingResult = await query(
    "SELECT id FROM bookings WHERE user_id = $1 AND status = 'confirmed' LIMIT 1",
    [user.id]
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      role: user.role,
    },
    hasSurvey: surveyResult.rows.length > 0,
    hasBooking: bookingResult.rows.length > 0,
  });
});

// POST /api/auth/refresh
exports.refreshToken = asyncHandler(async (req, res) => {
  // Implement refresh token logic
  res.json({ message: 'refresh' });
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  res.json({ success: true });
});
