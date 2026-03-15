const { Redis } = require('@upstash/redis');
const config = require('../config/config');
const logger = require('../utils/logger');

let redis;

if (config.redis.url && config.redis.token) {
  redis = new Redis({
    url: config.redis.url,
    token: config.redis.token,
  });
} else {
  logger.warn("Cache Service: Redis credentials missing. Caching is disabled.");
}

const getCache = async (key) => {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (error) {
    logger.error(`Cache Get Error: ${error.message}`);
    return null;
  }
};

const setCache = async (key, value) => {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: config.redis.ttl });
  } catch (error) {
    logger.error(`Cache Set Error: ${error.message}`);
  }
};

module.exports = { getCache, setCache };
