const { query, getClient } = require('../config/db');
const redis = require('../config/redis');
const { createRazorpayOrder, verifyWebhookSignature, verifyPaymentSignature } = require('../services/razorpay.service');
const { calculatePrice } = require('../services/pricing.service');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/bookings
// Body: { onward_shift_id, return_shift_id?, booking_dates, return_dates? }
exports.createOrder = asyncHandler(async (req, res) => {
  const { onward_shift_id, return_shift_id, booking_dates, return_dates = [] } = req.body;
  const userId = req.user.userId;

  const onwardTrips = booking_dates.length;
  const returnTrips = return_dates.length;

  // Calculate pricing
  const { perTripOnward, perTripReturn, total } = calculatePrice(onwardTrips, returnTrips);

  // Create Razorpay order
  const razorpayOrder = await createRazorpayOrder(total * 100); // paise

  // Create pending booking
  const monthYear = booking_dates[0].substring(0, 7); // e.g. '2026-05'
  // Lookup route_id from the onward shift
  const { rows: shiftRows } = await query(
    'SELECT route_id FROM shifts WHERE id = $1',
    [onward_shift_id]
  );
  const routeId = shiftRows[0]?.route_id || null;

  const { rows } = await query(
    `INSERT INTO bookings
       (user_id, onward_shift_id, return_shift_id, booking_dates, return_dates,
        onward_trips, return_trips, per_trip_rate_onward, per_trip_rate_return,
        amount_total, status, razorpay_order_id, month_year, route_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12,$13)
     RETURNING *`,
    [userId, onward_shift_id, return_shift_id, booking_dates, return_dates,
     onwardTrips, returnTrips, perTripOnward, perTripReturn,
     total, razorpayOrder.id, monthYear, routeId]
  );

  res.json({
    booking: rows[0],
    razorpayOrder: {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    }
  });
});

// POST /api/bookings/webhook — Razorpay webhook (idempotent)
exports.webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const isValid = verifyWebhookSignature(req.body, signature);

  if (!isValid) return res.status(400).json({ error: 'Invalid signature' });

  const event = JSON.parse(req.body.toString());

  if (event.event === 'payment.captured') {
    const orderId = event.payload.payment.entity.order_id;
    const paymentId = event.payload.payment.entity.id;

    // Idempotency check
    const existing = await query(
      "SELECT id FROM bookings WHERE razorpay_order_id = $1 AND status = 'confirmed'",
      [orderId]
    );
    if (existing.rows.length > 0) {
      return res.json({ received: true, message: 'Already processed' });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Confirm booking
      const { rows } = await client.query(
        `UPDATE bookings
         SET status = 'confirmed', razorpay_payment_id = $1, confirmed_at = NOW()
         WHERE razorpay_order_id = $2
         RETURNING *`,
        [paymentId, orderId]
      );

      const booking = rows[0];
      if (!booking) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Convert holds to confirmed bookings in inventory
      for (const date of booking.booking_dates) {
        await client.query(
          `UPDATE seat_inventory
           SET seats_booked = seats_booked + 1,
               seats_held = GREATEST(seats_held - 1, 0)
           WHERE shift_id = $1 AND date = $2`,
          [booking.onward_shift_id, date]
        );
      }

      if (booking.return_shift_id) {
        for (const date of booking.return_dates || []) {
          await client.query(
            `UPDATE seat_inventory
             SET seats_booked = seats_booked + 1,
                 seats_held = GREATEST(seats_held - 1, 0)
             WHERE shift_id = $1 AND date = $2`,
            [booking.return_shift_id, date]
          );
        }
      }

      // Clear Redis hold
      await redis.del(`hold:${booking.user_id}:${booking.onward_shift_id}`).catch(() => {});

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  res.json({ received: true });
});

// POST /api/bookings/verify — client-side Razorpay payment verification
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const userId = req.user.userId;

  const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE bookings
       SET status = 'confirmed', razorpay_payment_id = $1, confirmed_at = NOW()
       WHERE razorpay_order_id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING *`,
      [razorpay_payment_id, razorpay_order_id, userId]
    );

    const booking = rows[0];
    if (!booking) {
      await client.query('ROLLBACK');
      return res.json({ confirmed: true, already: true });
    }

    for (const date of booking.booking_dates) {
      await client.query(
        `UPDATE seat_inventory
         SET seats_booked = seats_booked + 1,
             seats_held = GREATEST(seats_held - 1, 0)
         WHERE shift_id = $1 AND date = $2`,
        [booking.onward_shift_id, date]
      );
    }

    if (booking.return_shift_id) {
      for (const date of booking.return_dates || []) {
        await client.query(
          `UPDATE seat_inventory
           SET seats_booked = seats_booked + 1,
               seats_held = GREATEST(seats_held - 1, 0)
           WHERE shift_id = $1 AND date = $2`,
          [booking.return_shift_id, date]
        );
      }
    }

    await redis.del(`hold:${userId}:${booking.onward_shift_id}`).catch(() => {});
    await client.query('COMMIT');
    res.json({ confirmed: true, booking });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// GET /api/bookings/me
exports.getMyBookings = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT b.*,
            s_on.departure_time AS onward_time,
            s_on.label         AS onward_label,
            s_ret.departure_time AS return_time,
            s_ret.label         AS return_label,
            r.name              AS route_name,
            r.origin_area,
            r.destination_area
     FROM bookings b
     LEFT JOIN shifts s_on  ON b.onward_shift_id = s_on.id
     LEFT JOIN shifts s_ret ON b.return_shift_id  = s_ret.id
     LEFT JOIN routes r     ON s_on.route_id      = r.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [req.user.userId]
  );

  res.json(rows);
});
