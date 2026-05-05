const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/users/me
exports.getMe = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, email, avatar_url, role, phone, whatsapp_opt, created_at
     FROM users WHERE id = $1`,
    [req.user.userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  const u = rows[0];
  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatar_url,
    role: u.role,
    phone: u.phone,
    whatsappOpt: u.whatsapp_opt,
    createdAt: u.created_at,
  });
});

// PATCH /api/users/me
exports.updateMe = asyncHandler(async (req, res) => {
  const { phone, whatsapp_opt } = req.body;
  const userId = req.user.userId;

  const { rows: existing } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (existing.length === 0) return res.status(404).json({ error: 'User not found' });

  const u = existing[0];
  const newPhone = phone !== undefined ? phone : u.phone;
  const newWhatsappOpt = whatsapp_opt !== undefined ? Boolean(whatsapp_opt) : u.whatsapp_opt;

  const { rows } = await query(
    `UPDATE users SET phone = $1, whatsapp_opt = $2, updated_at = NOW()
     WHERE id = $3 RETURNING id, name, email, avatar_url, role, phone, whatsapp_opt`,
    [newPhone, newWhatsappOpt, userId]
  );

  const updated = rows[0];
  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    avatarUrl: updated.avatar_url,
    role: updated.role,
    phone: updated.phone,
    whatsappOpt: updated.whatsapp_opt,
  });
});
