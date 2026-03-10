const dotenv = require('dotenv');

dotenv.config();

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: toInt(process.env.PORT, 4000),
  APP_ORIGIN: process.env.APP_ORIGIN || 'http://localhost:3000',
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000',

  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/smart_badminton',
  PG_POOL_MAX: toInt(process.env.PG_POOL_MAX, 20),

  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  BOOKING_LOCK_TTL_SECONDS: toInt(process.env.BOOKING_LOCK_TTL_SECONDS, 300),
  BOOKING_SWEEP_INTERVAL_MS: toInt(process.env.BOOKING_SWEEP_INTERVAL_MS, 30000),

  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'stripe_mock',
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_dev_change_me',
  PAYMENT_WEBHOOK_TOLERANCE_SECONDS: toInt(process.env.PAYMENT_WEBHOOK_TOLERANCE_SECONDS, 300),
  DEFAULT_CURRENCY: (process.env.DEFAULT_CURRENCY || 'USD').toUpperCase(),

  AI_SERVICE_BASE_URL: process.env.AI_SERVICE_BASE_URL || 'http://localhost:8001'
};

module.exports = { env };
