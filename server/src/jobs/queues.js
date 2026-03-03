// Background job queues - requires Redis, gracefully skips if unavailable
const logger = require('../utils/logger');

let queuesAvailable = false;

const setupRecurringJobs = () => {
    try {
        const Queue = require('bull');
        const testQueue = new Queue('test', {
            redis: { host: process.env.REDIS_HOST || 'localhost', port: process.env.REDIS_PORT || 6379 },
        });

        // Test connection
        testQueue.isReady().then(() => {
            queuesAvailable = true;
            testQueue.close();
            logger.info('Job queues ready');
        }).catch(() => {
            queuesAvailable = false;
            logger.warn('Job queues not available (Redis required)');
        });
    } catch (e) {
        queuesAvailable = false;
        logger.warn('Job queues not available');
    }
};

module.exports = { setupRecurringJobs };
