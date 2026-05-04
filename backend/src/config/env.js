const dotenv = require('dotenv');

dotenv.config();

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toBoolean(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: toInt(process.env.PORT, 4000),
  AUTO_APPLY_SCHEMA: toBoolean(process.env.AUTO_APPLY_SCHEMA, true),
  AUTO_RUN_SEED: toBoolean(process.env.AUTO_RUN_SEED, false),
  APP_ORIGIN: process.env.APP_ORIGIN || 'http://localhost:3000',
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000',

  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/smart_badminton',
  PG_POOL_MAX: toInt(process.env.PG_POOL_MAX, 20),

  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_ENABLED: toBoolean(process.env.REDIS_ENABLED, true),

  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  BOOKING_LOCK_TTL_SECONDS: toInt(process.env.BOOKING_LOCK_TTL_SECONDS, 600),
  BOOKING_SWEEP_INTERVAL_MS: toInt(process.env.BOOKING_SWEEP_INTERVAL_MS, 30000),
  BOOKING_EXPIRY_JOB_ENABLED: toBoolean(process.env.BOOKING_EXPIRY_JOB_ENABLED, true),

  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'sepay',
  PAYMENT_WEBHOOK_TOLERANCE_SECONDS: toInt(process.env.PAYMENT_WEBHOOK_TOLERANCE_SECONDS, 300),
  DEFAULT_CURRENCY: (process.env.DEFAULT_CURRENCY || 'VND').toUpperCase(),
  SEPAY_API_KEY: process.env.SEPAY_API_KEY || '',
  SEPAY_IPN_SECRET: process.env.SEPAY_IPN_SECRET || '',
  SEPAY_MERCHANT_CODE: process.env.SEPAY_MERCHANT_CODE || '',
  SEPAY_BANK_CODE: process.env.SEPAY_BANK_CODE || 'MB',
  SEPAY_TRANSFER_PREFIX: process.env.SEPAY_TRANSFER_PREFIX || 'BOOKING',
  BANK_NAME: process.env.BANK_NAME || 'MB Bank',
  BANK_ACCOUNT_NO: process.env.BANK_ACCOUNT_NO || '55463688',
  BANK_ACCOUNT_NAME: process.env.BANK_ACCOUNT_NAME || 'LE TRONG HIEU',

  AI_SERVICE_BASE_URL: process.env.AI_SERVICE_BASE_URL || 'http://localhost:8001'
};

module.exports = { env };
