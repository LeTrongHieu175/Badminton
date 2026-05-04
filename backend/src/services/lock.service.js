const crypto = require('crypto');
const { redisClient, isRedisEnabled } = require('../config/redis');

// Fallback for single-instance demo deployments when Redis is intentionally disabled.
const localLocks = new Map();

function buildLockKey(courtId, slotId, bookingDate) {
  return `lock:court:${courtId}:slot:${slotId}:date:${bookingDate}`;
}

function createLockToken(userId) {
  return `${userId}:${crypto.randomUUID()}`;
}

function getLocalLock(lockKey) {
  const currentLock = localLocks.get(lockKey);
  if (!currentLock) {
    return null;
  }

  if (currentLock.expiresAt <= Date.now()) {
    localLocks.delete(lockKey);
    return null;
  }

  return currentLock;
}

async function acquireLock(lockKey, lockToken, ttlSeconds) {
  if (!isRedisEnabled()) {
    const currentLock = getLocalLock(lockKey);
    if (currentLock) {
      return false;
    }

    localLocks.set(lockKey, {
      lockToken,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
    return true;
  }

  const result = await redisClient.set(lockKey, lockToken, {
    NX: true,
    EX: ttlSeconds
  });

  return result === 'OK';
}

async function releaseLock(lockKey, lockToken) {
  if (!isRedisEnabled()) {
    const currentLock = getLocalLock(lockKey);
    if (!currentLock || currentLock.lockToken !== (lockToken || '')) {
      return false;
    }

    localLocks.delete(lockKey);
    return true;
  }

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
