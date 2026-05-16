const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_ZqCu46TAXHSJ@ep-fragrant-river-an9pfz7d-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

client.connect()
  .then(() => client.query(`
    SELECT id, name, area, lat, lng, verified, aliases
    FROM apartments
    WHERE id = 'c2461633-5077-4eb0-ad9e-33223b993d5f'
  `))
  .then(r => {
    console.log('Current DB record:');
    console.log(JSON.stringify(r.rows[0], null, 2));
    // Now fix: area should be Tellapur not Madhapur (coords confirm it's in Tellapur)
    return client.query(`
      UPDATE apartments
      SET area = 'Tellapur'
      WHERE id = 'c2461633-5077-4eb0-ad9e-33223b993d5f'
      RETURNING id, name, area, verified
    `);
  })
  .then(r => {
    console.log('\n✅ Fixed! Updated record:');
    console.log(JSON.stringify(r.rows[0], null, 2));
    client.end();
  })
  .catch(e => { console.error(e.message); client.end(); });
