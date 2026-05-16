require('dotenv').config();
const { query } = require('../src/config/db');
const { indexOffice } = require('../src/services/typesense.service');

async function seed() {
  console.log('Fetching all offices from DB...');
  const { rows: offices } = await query('SELECT * FROM offices');
  console.log(`Found ${offices.length} offices. Indexing...`);

  for (const office of offices) {
    await indexOffice(office);
  }

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
