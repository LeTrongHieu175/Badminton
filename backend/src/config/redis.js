const { createClient } = require('redis');
const { env } = require('./env');

const redisClient = env.REDIS_ENABLED
  ? createClient({
      url: env.REDIS_URL
    })
  : null;

if (redisClient) {
  redisClient.on('error', (error) => {
    console.error('[redis] client error', error);
  });
}

function isRedisEnabled() {
  return env.REDIS_ENABLED;
}

async function connectRedis() {
  if (!redisClient) {
    console.warn('[redis] disabled; using in-memory lock fallback');
    return null;
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

async function closeRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
}

module.exports = {
  redisClient,
  connectRedis,
  closeRedis,
  isRedisEnabled
};
