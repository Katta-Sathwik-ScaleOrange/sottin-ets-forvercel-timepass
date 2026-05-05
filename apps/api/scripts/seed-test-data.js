/**
 * seed-test-data.js
 *
 * Inserts 25 realistic test survey responses with varied apartments, offices,
 * preferred days, timing bands, and estimated days.
 *
 * Run: node apps/api/scripts/seed-test-data.js
 *
 * Safe to run multiple times — uses ON CONFLICT DO UPDATE on user email.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');

// ── Realistic test commuters ──────────────────────────────────────────────────
const TEST_USERS = [
  { name: 'Arjun Reddy',     email: 'arjun.reddy@testuser.dev',    apt: 'My Home Bhooja',        office: 'Amazon Development Centre',         days: ['Mon','Tue','Wed','Thu','Fri'], freq: 20, morning: 'after_930',  evening: 'after_7'   },
  { name: 'Priya Sharma',    email: 'priya.sharma@testuser.dev',   apt: 'Aliens Elite',           office: 'Microsoft India Development Centre',days: ['Mon','Wed','Fri'],             freq: 12, morning: '830_930',    evening: '6_7'       },
  { name: 'Rahul Verma',     email: 'rahul.verma@testuser.dev',    apt: 'My Home Bhooja',         office: 'Deloitte Offices',                  days: ['Mon','Tue','Wed','Thu','Fri'], freq: 20, morning: 'after_930',  evening: '6_7'       },
  { name: 'Neha Gupta',      email: 'neha.gupta@testuser.dev',     apt: 'Aliens Hub',             office: 'Infosys Limited',                   days: ['Mon','Tue','Thu','Fri'],       freq: 16, morning: '830_930',    evening: 'after_7'   },
  { name: 'Karthik Rao',     email: 'karthik.rao@testuser.dev',    apt: 'My Home Bhooja',         office: 'Wipro Technologies',                days: ['Mon','Wed','Thu'],             freq: 12, morning: 'after_930',  evening: '5_6'       },
  { name: 'Divya Nair',      email: 'divya.nair@testuser.dev',     apt: 'Aliens Elite',           office: 'TCS Synergy Park',                  days: ['Tue','Wed','Thu','Fri'],       freq: 16, morning: '730_830',    evening: '6_7'       },
  { name: 'Suresh Kumar',    email: 'suresh.kumar@testuser.dev',   apt: 'My Home Bhooja',         office: 'Amazon Development Centre',         days: ['Mon','Tue','Wed','Thu','Fri'], freq: 20, morning: 'after_930',  evening: 'after_7'   },
  { name: 'Anjali Singh',    email: 'anjali.singh@testuser.dev',   apt: 'My Home Bhooja',         office: 'Cognizant Technology Solutions',    days: ['Mon','Tue','Thu'],             freq: 12, morning: '830_930',    evening: '6_7'       },
  { name: 'Vikram Patel',    email: 'vikram.patel@testuser.dev',   apt: 'Aliens Hub',             office: 'Accenture',                         days: ['Mon','Tue','Wed','Thu','Fri'], freq: 20, morning: '830_930',    evening: '6_7'       },
  { name: 'Meera Iyer',      email: 'meera.iyer@testuser.dev',     apt: 'Aliens Elite',           office: 'Deloitte Offices',                  days: ['Wed','Thu','Fri'],             freq: 12, morning: 'after_930',  evening: 'after_7'   },
  { name: 'Aditya Bhatt',    email: 'aditya.bhatt@testuser.dev',   apt: 'My Home Bhooja',         office: 'IBM India',                         days: ['Mon','Tue','Wed','Thu','Fri'], freq: 16, morning: 'after_930',  evening: '5_6'       },
  { name: 'Swati Joshi',     email: 'swati.joshi@testuser.dev',    apt: 'My Home Bhooja',         office: 'Capgemini',                         days: ['Mon','Thu','Fri'],             freq: 12, morning: '830_930',    evening: '6_7'       },
  { name: 'Ravi Shankar',    email: 'ravi.shankar@testuser.dev',   apt: 'Aliens Elite',           office: 'Amazon Development Centre',         days: ['Mon','Tue','Wed','Thu','Fri'], freq: 20, morning: 'after_930',  evening: 'after_7'   },
  { name: 'Pooja Mehta',     email: 'pooja.mehta@testuser.dev',    apt: 'Aliens Hub',             office: 'Microsoft India Development Centre',days: ['Tue','Wed','Thu'],             freq: 12, morning: '730_830',    evening: '5_6'       },
  { name: 'Santhosh Naidu',  email: 'santhosh.n@testuser.dev',     apt: 'My Home Bhooja',         office: 'Wipro Technologies',                days: ['Mon','Tue','Wed','Thu','Fri'], freq: 20, morning: 'after_930',  evening: '6_7'       },
  { name: 'Kavya Reddy',     email: 'kavya.reddy@testuser.dev',    apt: 'My Home Bhooja',         office: 'TCS Synergy Park',                  days: ['Mon','Wed','Fri'],             freq:  8, morning: '830_930',    evening: 'after_7'   },
  { name: 'Nikhil Goud',     email: 'nikhil.goud@testuser.dev',    apt: 'Aliens Elite',           office: 'Infosys Limited',                   days: ['Mon','Tue','Thu','Fri'],       freq: 16, morning: 'after_930',  evening: '6_7'       },
  { name: 'Sridevi Lal',     email: 'sridevi.lal@testuser.dev',    apt: 'Aliens Hub',             office: 'Accenture',                         days: ['Tue','Wed','Thu','Fri'],       freq: 16, morning: '830_930',    evening: '5_6'       },
  { name: 'Harish Teja',     email: 'harish.teja@testuser.dev',    apt: 'My Home Bhooja',         office: 'Cognizant Technology Solutions',    days: ['Mon','Tue','Wed','Thu','Fri'], freq: 20, morning: 'after_930',  evening: 'after_7'   },
  { name: 'Bhavana Pillai',  email: 'bhavana.p@testuser.dev',      apt: 'My Home Bhooja',         office: 'SAP Labs',                          days: ['Mon','Wed','Thu'],             freq:  8, morning: '730_830',    evening: '6_7'       },
  { name: 'Charan Tej',      email: 'charan.tej@testuser.dev',     apt: 'Aliens Elite',           office: 'Amazon Development Centre',         days: ['Mon','Tue','Wed','Thu','Fri'], freq: 20, morning: 'after_930',  evening: 'after_7'   },
  { name: 'Deepika Rao',     email: 'deepika.rao@testuser.dev',    apt: 'Aliens Hub',             office: 'Deloitte Offices',                  days: ['Mon','Thu','Fri'],             freq: 12, morning: '830_930',    evening: '6_7'       },
  { name: 'Manoj Babu',      email: 'manoj.babu@testuser.dev',     apt: 'My Home Bhooja',         office: 'Wipro Technologies',                days: ['Tue','Wed','Thu','Fri'],       freq: 16, morning: 'after_930',  evening: '5_6'       },
  { name: 'Padmaja Rao',     email: 'padmaja.rao@testuser.dev',    apt: 'Aliens Elite',           office: 'Microsoft India Development Centre',days: ['Mon','Tue','Thu'],             freq: 12, morning: '830_930',    evening: 'after_7'   },
  { name: 'Venkat Prasad',   email: 'venkat.p@testuser.dev',       apt: 'My Home Bhooja',         office: 'TCS Synergy Park',                  days: ['Mon','Tue','Wed','Thu','Fri'], freq: 20, morning: 'after_930',  evening: '6_7'       },
];

async function run() {
  const client = await pool.connect();
  try {
    console.log('\n🧪 Seeding test data (25 survey responses)...\n');
    await client.query('BEGIN');

    // Fetch apartment IDs
    const { rows: aptRows } = await client.query('SELECT id, name FROM apartments');
    const aptMap = {};
    aptRows.forEach(a => { aptMap[a.name.toLowerCase()] = a.id; });

    // Fetch office IDs
    const { rows: offRows } = await client.query('SELECT id, name FROM offices');
    const offMap = {};
    offRows.forEach(o => { offMap[o.name.toLowerCase()] = o.id; });

    let inserted = 0, skipped = 0;

    for (let i = 0; i < TEST_USERS.length; i++) {
      const u = TEST_USERS[i];

      // Upsert test user
      const { rows: userRows } = await client.query(
        `INSERT INTO users (google_id, name, email, avatar_url, role)
         VALUES ($1, $2, $3, $4, 'rider')
         ON CONFLICT (google_id) DO UPDATE
           SET name = EXCLUDED.name, updated_at = NOW()
         RETURNING id`,
        [`testgoogle_${i + 1}`, u.name, u.email,
         `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}&backgroundColor=22c55e&textColor=ffffff`]
      );
      const userId = userRows[0].id;

      // Look up apartment and office IDs
      const aptId = aptMap[u.apt.toLowerCase()] || null;
      const offId = offMap[u.office.toLowerCase()] || null;

      if (!aptId) {
        console.log(`  ⚠  Apartment not found: "${u.apt}" — skipping ${u.name}`);
        skipped++;
        continue;
      }
      if (!offId) {
        console.log(`  ⚠  Office not found: "${u.office}" — skipping ${u.name}`);
        skipped++;
        continue;
      }

      // Upsert survey response
      await client.query(
        `INSERT INTO survey_responses
           (user_id, apartment_id, office_id, preferred_days, estimated_days_month,
            morning_band, evening_band, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 NOW() - (RANDOM() * INTERVAL '14 days'))
         ON CONFLICT (user_id) DO UPDATE SET
           apartment_id          = EXCLUDED.apartment_id,
           office_id             = EXCLUDED.office_id,
           preferred_days        = EXCLUDED.preferred_days,
           estimated_days_month  = EXCLUDED.estimated_days_month,
           morning_band          = EXCLUDED.morning_band,
           evening_band          = EXCLUDED.evening_band,
           submitted_at          = EXCLUDED.submitted_at`,
        [userId, aptId, offId, u.days, u.freq, u.morning, u.evening]
      );
      inserted++;
    }

    await client.query('COMMIT');

    // Summary
    const { rows: survCount } = await client.query('SELECT COUNT(*) FROM survey_responses');
    const { rows: userCount } = await client.query("SELECT COUNT(*) FROM users WHERE role = 'rider'");
    const { rows: topCorridor } = await client.query(`
      SELECT a.area AS origin, o.area AS destination, COUNT(*) AS cnt
      FROM survey_responses sr
      JOIN apartments a ON sr.apartment_id = a.id
      JOIN offices o    ON sr.office_id    = o.id
      GROUP BY a.area, o.area
      ORDER BY cnt DESC LIMIT 3
    `);

    console.log(`\n✅ Done! Inserted/updated ${inserted} responses, skipped ${skipped}.`);
    console.log(`\n📊 Database summary:`);
    console.log(`   Total survey responses : ${survCount[0].count}`);
    console.log(`   Total rider users      : ${userCount[0].count}`);
    console.log('\n🗺  Top corridors:');
    topCorridor.forEach(r => {
      console.log(`   ${r.origin} → ${r.destination} : ${r.cnt} responses`);
    });
    console.log('');

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('\n❌ Test data seed failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
