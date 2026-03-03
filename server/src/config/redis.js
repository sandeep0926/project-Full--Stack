const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;
let redisAvailable = false;

const createRedisClient = () => {
    if (redisClient) return redisClient;

    redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
            if (times > 2) {
                redisAvailable = false;
                return null; // stop retrying
            }
            return Math.min(times * 100, 1000);
        },
        lazyConnect: true,
        enableOfflineQueue: false,
    });

    redisClient.on('connect', () => {
        redisAvailable = true;
        logger.info('Redis connected');
    });

    redisClient.on('error', () => {
        redisAvailable = false;
    });

    return redisClient;
};

const getRedisClient = () => {
    if (!redisClient) return createRedisClient();
    return redisClient;
};

const isRedisAvailable = () => redisAvailable;

// Cache helper methods - all silently fail if Redis is down
const cacheGet = async (key) => {
    if (!redisAvailable) return null;
    try {
        const client = getRedisClient();
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};

const cacheSet = async (key, value, ttlSeconds = 3600) => {
    if (!redisAvailable) return;
    try {
        const client = getRedisClient();
        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch { }
};

const cacheDel = async (key) => {
    if (!redisAvailable) return;
    try {
        const client = getRedisClient();
        await client.del(key);
    } catch { }
};

const cacheFlushPattern = async (pattern) => {
    if (!redisAvailable) return;
    try {
        const client = getRedisClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) await client.del(...keys);
    } catch { }
};

module.exports = {
    createRedisClient,
    getRedisClient,
    isRedisAvailable,
    cacheGet,
    cacheSet,
    cacheDel,
    cacheFlushPattern,
};
