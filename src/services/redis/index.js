import config from '../../config'
import { createClient } from 'redis'

export const getRedisOption = () => {
  const redisOpt = {}

  if (config.redis.prefix) {
    redisOpt.prefix = config.redis.prefix
  }
  if (config.redis.uri) {
    redisOpt.url = config.redis.uri;
    return redisOpt;
  }
  if (config.redis.port) {
    redisOpt.port = config.redis.port
  }
  if (config.redis.host) {
    redisOpt.host = config.redis.host
  }
  if (config.redis.password) {
    redisOpt.password = config.redis.password
  }
  console.log('redisOpt', redisOpt);
  return redisOpt
}

export const redisClient = createClient(getRedisOption())
  .on('error', (err) => console.log('Redis Client Error', err))
  .on('connect', () => console.log('Redis Client Connect success'));

redisClient.connect();

/** GET value of KEY
 *
 * @param key string
 * @returns {Promise|any|Promise<T>} (value|false)
 */
export const getRedis = async (key) => {
  try {
    // Validate key
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key: must be a non-empty string');
    }

    // Get value from Redis
    const value = await redisClient.get(key);

    // Return null if key doesn't exist
    if (!value) return null;

    // Try parsing JSON
    try {
      return JSON.parse(value);
    } catch (e) {
      // Return as-is if not JSON
      return value;
    }

  } catch (error) {
    console.error('Redis get error:', error);
  }
  return null
}

/** SET value into KEY
 * SET KEY VALUE [EX seconds|PX milliseconds] [NX|XX|null]
 * @param key
 * @param value
 * @param expire
 * @returns {Promise|any|Promise<T>} (true|false)
 */
export const setRedis = async (key, value, expire = 3600) => {
  try {
    // Validate inputs
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key: must be a non-empty string');
    }

    // Convert value to string if needed
    const stringValue = typeof value === 'object' ?
      JSON.stringify(value) : String(value);

    // Set with expiration
    await redisClient.set(key, stringValue, {
      EX: parseInt(expire, 10)
    });

    return true;
  } catch (error) {
    console.error('Redis set error:', error);
  }
  return false;
}
/**
 * Remove a key from Redis cache
 * @param {string} key - Key to remove from Redis
 * @returns {Promise<boolean>} True if removed, false if key didn't exist
 */
export const delRedis = async (key) => {
  try {
    // Validate key
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key: must be a non-empty string');
    }

    // Delete key and get number of keys removed
    const result = await redisClient.del(key);

    // Return true if key was deleted, false if key didn't exist
    return result > 0;

  } catch (error) {
    console.error('Redis delete error:', error);
  }
  return false;
}

/**
 * Remove all keys matching the pattern from Redis
 * @param {string} pattern - Pattern to match keys (e.g., "user:*")
 * @returns {Promise<number>} Number of keys removed
 */
export const removeRedis = async (pattern) => {
  try {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('Invalid pattern: must be a non-empty string');
    }

    // Find all keys matching the pattern
    const keys = await redisClient.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    // Delete all matching keys
    const result = await redisClient.del(keys);
    return result;

  } catch (error) {
    console.error('Redis remove error:', error);
    return 0;
  }
}
