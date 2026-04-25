const { createClient } = require('redis');

const client = createClient({ url: process.env.REDIS_URL });
client.on('error', (err) => console.error('Redis error', err));

// Connect gracefully — don't crash if Redis is unavailable
client.connect().catch((err) => {
  console.warn('Redis connection failed — seat holds will not work:', err.message);
});

module.exports = client;
