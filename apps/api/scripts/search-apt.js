const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_ZqCu46TAXHSJ@ep-fragrant-river-an9pfz7d-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

client.connect()
  .then(() => client.query(`
    SELECT id, name, area, verified, aliases
    FROM apartments
    WHERE name ILIKE '%bhooja%'
       OR name ILIKE '%bhuja%'
       OR name ILIKE '%bhoo%'
    ORDER BY name
  `))
  .then(r => {
    if (r.rowCount === 0) {
      console.log('NOT FOUND: No apartment matching "Bhooja" exists in the database.');
      console.log('\nShowing all apartments (name + area):');
      return client.query('SELECT id, name, area FROM apartments ORDER BY name');
    } else {
      console.log('FOUND:', JSON.stringify(r.rows, null, 2));
      return { rows: [] };
    }
  })
  .then(r => {
    if (r && r.rows.length > 0) {
      r.rows.forEach(row => console.log(`  [${row.id}] ${row.name} — ${row.area}`));
    }
    client.end();
  })
  .catch(e => { console.error(e.message); client.end(); });
