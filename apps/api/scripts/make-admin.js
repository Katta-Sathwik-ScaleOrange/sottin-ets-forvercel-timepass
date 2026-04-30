/**
 * make-admin.js — Promote a user to admin role
 * Usage: node apps/api/scripts/make-admin.js your@email.com
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');

const email = process.argv[2];

if (!email) {
  console.error('\n❌ Usage: node apps/api/scripts/make-admin.js your@email.com\n');
  process.exit(1);
}

async function makeAdmin() {
  try {
    // Check if user exists
    const { rows: existing } = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      [email]
    );

    if (existing.length === 0) {
      console.error(`\n❌ No user found with email: ${email}`);
      console.log('   → Sign in with Google on the web app first, then run this script.\n');
      process.exit(1);
    }

    const user = existing[0];
    console.log(`\n👤 Found user: ${user.name} (${user.email}) — current role: ${user.role}`);

    if (user.role === 'admin') {
      console.log('✅ User is already an admin!\n');
      process.exit(0);
    }

    // Promote to admin
    const { rows } = await pool.query(
      "UPDATE users SET role = 'admin', updated_at = NOW() WHERE email = $1 RETURNING id, name, email, role",
      [email]
    );

    console.log(`✅ Success! ${rows[0].name} (${rows[0].email}) is now role: ${rows[0].role}`);
    console.log('   → You can now sign in at http://localhost:5174/login\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    pool.end();
  }
}

makeAdmin();
