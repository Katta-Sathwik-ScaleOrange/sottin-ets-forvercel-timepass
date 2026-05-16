/**
 * test-webhook-e2e.js
 * 
 * End-to-end test for the Razorpay webhook feature.
 * 1. Creates a test user (if not exists)
 * 2. Creates a pending booking with a mock razorpay_order_id
 * 3. Sends a simulated Razorpay webhook request with a valid signature
 * 4. Verifies the booking status is updated to 'confirmed'
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');
const crypto = require('crypto');
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret';

async function run() {
  console.log('\n🚀 Starting Webhook E2E Test...\n');

  // 1. Ensure we have a route and shift to book
  const { rows: shifts } = await pool.query('SELECT id, route_id FROM shifts LIMIT 1');
  if (shifts.length === 0) {
    console.error('❌ No shifts found in database. Please run "npm run db:seed" first.');
    process.exit(1);
  }
  const shift = shifts[0];

  // 2. Create/Get Test User
  const { rows: users } = await clientQuery(
    `INSERT INTO users (google_id, name, email, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    ['test_webhook_user', 'Webhook Tester', 'webhook@test.com', 'rider']
  );
  const userId = users[0].id;
  console.log(`✅ Test User ID: ${userId}`);

  // 3. Create Pending Booking
  const orderId = `order_test_${Date.now()}`;
  const paymentId = `pay_test_${Date.now()}`;
  
  await clientQuery(
    `INSERT INTO bookings (user_id, route_id, onward_shift_id, booking_dates, total_amount, razorpay_order_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, shift.route_id, shift.id, ['2026-05-20'], 15000, orderId, 'pending']
  );
  console.log(`✅ Pending Booking Created: ${orderId}`);

  // 4. Construct Webhook Payload
  const payload = {
    entity: 'event',
    account_id: 'acc_test',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: 'payment',
          amount: 15000,
          currency: 'INR',
          status: 'captured',
          order_id: orderId,
          method: 'upi'
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  };

  const body = JSON.stringify(payload);
  
  // 5. Generate Signature
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  console.log(`📡 Sending Webhook Request to ${API_URL}/bookings/webhook...`);

  try {
    const response = await axios.post(`${API_URL}/bookings/webhook`, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': signature
      }
    });

    console.log(`✅ Webhook Response: ${response.status} ${JSON.stringify(response.data)}`);

    // 6. Verify Database Update
    const { rows: bookings } = await pool.query(
      'SELECT status, razorpay_payment_id FROM bookings WHERE razorpay_order_id = $1',
      [orderId]
    );

    if (bookings[0]?.status === 'confirmed' && bookings[0]?.razorpay_payment_id === paymentId) {
      console.log('\n✨ SUCCESS: Booking updated to "confirmed" in database!');
    } else {
      console.error('\n❌ FAILURE: Booking status not updated correctly.');
      console.log('   Current state:', bookings[0]);
    }

  } catch (error) {
    console.error('\n❌ Webhook Request Failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }

  await pool.end();
}

async function clientQuery(sql, params) {
  return pool.query(sql, params);
}

run().catch(err => {
  console.error(err);
  pool.end();
});
