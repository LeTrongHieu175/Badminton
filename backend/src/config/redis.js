const { createClient } = require('redis');
const { env } = require('./env');

const redisClient = createClient({
  url: env.REDIS_URL
});

redisClient.on('error', (error) => {
  console.error('[redis] client error', error);
});

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

module.exports = {
  redisClient,
  connectRedis
};
