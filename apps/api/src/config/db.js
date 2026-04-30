const { Pool } = require('pg');

// Neon and any sslmode=require connection string always needs SSL, even in dev
const sslRequired =
  process.env.DATABASE_URL?.includes('neon.tech') ||
  process.env.DATABASE_URL?.includes('sslmode=require') ||
  process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslRequired ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('Unexpected PG pool error', err));

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
