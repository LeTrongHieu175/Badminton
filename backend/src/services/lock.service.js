const crypto = require('crypto');
const { redisClient } = require('../config/redis');

function buildLockKey(courtId, slotId, bookingDate) {
  return `lock:court:${courtId}:slot:${slotId}:date:${bookingDate}`;
}

function createLockToken(userId) {
  return `${userId}:${crypto.randomUUID()}`;
}

async function acquireLock(lockKey, lockToken, ttlSeconds) {
  const result = await redisClient.set(lockKey, lockToken, {
    NX: true,
    EX: ttlSeconds
  });

  return result === 'OK';
}

async function releaseLock(lockKey, lockToken) {
  const luaScript = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    else
      return 0
    end
  `;

  const deleted = await redisClient.eval(luaScript, {
    keys: [lockKey],
    arguments: [lockToken || '']
  });

  return deleted === 1;
}

module.exports = {
  buildLockKey,
  createLockToken,
  acquireLock,
  releaseLock
};
