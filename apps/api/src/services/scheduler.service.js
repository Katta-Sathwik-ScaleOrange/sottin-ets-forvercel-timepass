const cron = require('node-cron');
const { query } = require('../config/db');
const whatsappService = require('./whatsapp.service');

/**
 * Initialize all scheduled tasks
 */
exports.init = () => {
  // 1. Trip Reminder (Every night at 9 PM IST)
  // '0 21 * * *' in Asia/Kolkata
  cron.schedule('0 21 * * *', async () => {
    console.log('[Scheduler] Running Trip Reminders...');
    await sendTripReminders();
  }, {
    timezone: 'Asia/Kolkata'
  });

  // 2. Booking Window Open (25th of each month at 9 AM IST)
  // '0 9 25 * *' in Asia/Kolkata
  cron.schedule('0 9 25 * *', async () => {
    console.log('[Scheduler] Running Booking Window Notifications...');
    await sendBookingWindowNotifications();
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('⏰ Scheduler initialized (Asia/Kolkata)');
};

/**
 * Send reminders for trips happening tomorrow
 */
async function sendTripReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  try {
    // Find all confirmed bookings for tomorrow
    // We need user details, shift time, stop name, and route name
    const { rows: trips } = await query(
      `SELECT u.id AS user_id, u.phone, u.whatsapp_opt, u.name,
              s.departure_time, s.label AS shift_label,
              r.name AS route_name,
              st.label AS stop_label
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN shifts s ON (b.onward_shift_id = s.id OR b.return_shift_id = s.id)
       JOIN routes r ON s.route_id = r.id
       LEFT JOIN stops st ON st.route_id = r.id AND (
         (s.direction = 'onward' AND st.stop_type = 'pickup') OR
         (s.direction = 'return' AND st.stop_type = 'drop')
       )
       WHERE b.status = 'confirmed'
         AND ($1 = ANY(b.booking_dates) OR $1 = ANY(b.return_dates))
         AND u.whatsapp_opt = TRUE
         AND u.phone IS NOT NULL
       -- Group by user+shift to avoid duplicate reminders if multiple stops match (shouldn't happen with proper stop setup)
       ORDER BY u.id, s.departure_time`,
      [tomorrowStr]
    );

    for (const trip of trips) {
      await whatsappService.sendTripReminder(trip, {
        departureTime: trip.departure_time,
        stopName: trip.stop_label || 'Your designated stop',
        routeName: trip.route_name
      });
    }
    console.log(`[Scheduler] Sent ${trips.length} trip reminders.`);
  } catch (err) {
    console.error('[Scheduler] Trip reminder error:', err);
  }
}

/**
 * Send notification when booking window opens for next month
 */
async function sendBookingWindowNotifications() {
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const monthName = nextMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  try {
    const { rows: users } = await query(
      'SELECT id, phone, whatsapp_opt, name FROM users WHERE whatsapp_opt = TRUE AND phone IS NOT NULL'
    );

    for (const user of users) {
      await whatsappService.sendBookingWindowOpen(user, monthName);
    }
    console.log(`[Scheduler] Sent ${users.length} booking window notifications for ${monthName}.`);
  } catch (err) {
    console.error('[Scheduler] Booking window notification error:', err);
  }
}
