const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/trips/active — get today's active trip for rider
exports.getActiveTrip = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const today = new Date().toISOString().split('T')[0];

  const { rows } = await query(
    `SELECT b.*, 
            s.departure_time, s.label AS shift_label, s.direction,
            r.name AS route_name, r.origin_area, r.destination_area
     FROM bookings b
     JOIN shifts s ON b.onward_shift_id = s.id
     JOIN routes r ON s.route_id = r.id
     WHERE b.user_id = $1 
       AND b.status = 'confirmed'
       AND $2 = ANY(b.booking_dates)
     LIMIT 1`,
    [userId, today]
  );

  if (rows.length === 0) {
    // Check for upcoming trips
    const { rows: upcoming } = await query(
      `SELECT b.booking_dates, s.departure_time, s.label AS shift_label,
              r.name AS route_name, r.destination_area,
              st.label AS stop_name
       FROM bookings b
       JOIN shifts s ON b.onward_shift_id = s.id
       JOIN routes r ON s.route_id = r.id
       LEFT JOIN stops st ON st.route_id = r.id AND st.sequence = 1
       WHERE b.user_id = $1 AND b.status = 'confirmed'
         AND b.booking_dates && ARRAY[CURRENT_DATE]::date[]
         OR b.booking_dates > ARRAY[$2]::date[]
       ORDER BY b.booking_dates[1]
       LIMIT 1`,
      [userId, today]
    );

    return res.json({
      tripState: upcoming.length > 0 ? 'upcoming' : 'none',
      trip: upcoming[0] || null,
    });
  }

  res.json({
    tripState: 'active',
    trip: rows[0],
  });
});

// POST /api/trips/ping — Stage 3: GPS telemetry from bus
exports.pingLocation = asyncHandler(async (req, res) => {
  const { bus_id, lat, lng, speed, heading } = req.body;
  // Stage 3 — store in PostGIS, broadcast via Socket.io
  console.log(`📍 Bus ${bus_id}: ${lat}, ${lng}`);
  res.json({ received: true });
});
