// Validated environment variable access
const required = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const optional = [
  'JWT_EXPIRES_IN',
  'GOOGLE_CLIENT_ID',
  'REDIS_URL',
  'GOOGLE_PLACES_API_KEY',
  'TYPESENSE_HOST',
  'TYPESENSE_PORT',
  'TYPESENSE_API_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'WHATSAPP_API_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'PORT',
  'NODE_ENV',
  'FRONTEND_URL',
  'APP_STAGE',
  'SEAT_HOLD_TTL_SECONDS',
];

function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`⚠️  Missing required env vars: ${missing.join(', ')}`);
  }
}

validateEnv();

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  PORT: parseInt(process.env.PORT || '3001'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_STAGE: process.env.APP_STAGE || 'survey',
  SEAT_HOLD_TTL_SECONDS: parseInt(process.env.SEAT_HOLD_TTL_SECONDS || '600'),
};
