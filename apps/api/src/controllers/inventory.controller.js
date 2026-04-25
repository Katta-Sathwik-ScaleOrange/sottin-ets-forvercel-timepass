const { query, getClient } = require('../config/db');
const redis = require('../config/redis');
const asyncHandler = require('../utils/asyncHandler');

const HOLD_TTL = parseInt(process.env.SEAT_HOLD_TTL_SECONDS || '600');

// GET /api/inventory/:shiftId/:year/:month
// Returns all dates in month with seat availability
// One API call = full calendar data for the booking UI
exports.getMonthInventory = asyncHandler(async (req, res) => {
  const { shiftId, year, month } = req.params;

  const { rows } = await query(
    `WITH month_days AS (
       SELECT generate_series(
         date_trunc('month', make_date($2::int, $3::int, 1)),
         date_trunc('month', make_date($2::int, $3::int, 1)) + interval '1 month' - interval '1 day',
         interval '1 day'
       )::date AS date
     ),
     working_days AS (
       SELECT date FROM month_days
       WHERE EXTRACT(DOW FROM date) BETWEEN 1 AND 5  -- Mon-Fri only
     )
     SELECT
       wd.date,
       COALESCE(si.seats_total, s.bus_capacity) AS seats_total,
       COALESCE(si.seats_booked, 0) AS seats_booked,
       COALESCE(si.seats_held, 0) AS seats_held,
       GREATEST(
         COALESCE(si.seats_total, s.bus_capacity) 
         - COALESCE(si.seats_booked, 0) 
         - COALESCE(si.seats_held, 0),
         0
       ) AS seats_available
     FROM working_days wd
     LEFT JOIN seat_inventory si ON si.shift_id = $1 AND si.date = wd.date
     JOIN shifts s ON s.id = $1
     ORDER BY wd.date`,
    [shiftId, year, month]
  );

  res.json(rows);
});

// POST /api/inventory/hold
// Body: { shift_id, dates: ['2026-05-01', ...] }
exports.holdSeats = asyncHandler(async (req, res) => {
  const { shift_id, dates } = req.body;
  const userId = req.user.userId;

  if (!dates || dates.length === 0) {
    return res.status(400).json({ error: 'No dates provided' });
  }

  const holdKey = `hold:${userId}:${shift_id}`;

  // Check if user already has a hold (release it first)
  const existingHold = await redis.get(holdKey);
  if (existingHold) {
    const parsed = JSON.parse(existingHold);
    await releaseHoldFromDB(parsed.shift_id, parsed.dates);
  }

  // Attempt to hold seats in a transaction
  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const date of dates) {
      // Upsert inventory row if it doesn't exist
      await client.query(
        `INSERT INTO seat_inventory (shift_id, date, seats_total, seats_booked, seats_held)
         SELECT $1, $2, bus_capacity, 0, 0
         FROM shifts WHERE id = $1
         ON CONFLICT (shift_id, date) DO NOTHING`,
        [shift_id, date]
      );

      // Try to increment hold count
      const { rows } = await client.query(
        `UPDATE seat_inventory
         SET seats_held = seats_held + 1
         WHERE shift_id = $1 AND date = $2
           AND (seats_total - seats_booked - seats_held) > 0
         RETURNING seats_held`,
        [shift_id, date]
      );

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `No seats available on ${date}` });
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  // Store hold in Redis with TTL
  await redis.setEx(holdKey, HOLD_TTL, JSON.stringify({ shift_id, dates }));

  // Also store in DB for audit trail
  await query(
    `INSERT INTO seat_holds (user_id, shift_id, dates, expires_at)
     VALUES ($1, $2, $3, NOW() + interval '${HOLD_TTL} seconds')`,
    [userId, shift_id, dates]
  );

  res.json({ held: true, expiresInSeconds: HOLD_TTL, dates });
});

// DELETE /api/inventory/hold
exports.releaseHold = asyncHandler(async (req, res) => {
  const { shift_id } = req.body;
  const userId = req.user.userId;

  const holdKey = `hold:${userId}:${shift_id}`;
  const holdData = await redis.get(holdKey);

  if (holdData) {
    const parsed = JSON.parse(holdData);
    await releaseHoldFromDB(parsed.shift_id, parsed.dates);
    await redis.del(holdKey);
  }

  res.json({ released: true });
});

async function releaseHoldFromDB(shiftId, dates) {
  if (!dates || dates.length === 0) return;
  await query(
    `UPDATE seat_inventory
     SET seats_held = GREATEST(seats_held - 1, 0)
     WHERE shift_id = $1 AND date = ANY($2::date[])`,
    [shiftId, dates]
  );
}
