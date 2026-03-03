// Background job queues - requires Redis, gracefully skips if unavailable
import logger from '../utils/logger.js';
import Bull from 'bull';

let queuesAvailable = false;
let documentQueue = null;
let analyticsQueue = null;

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};

const setupRecurringJobs = () => {
    try {
        const testQueue = new Bull('test', {
            redis: redisConfig,
        });

        // Test connection
        testQueue
            .isReady()
            .then(() => {
                queuesAvailable = true;
                testQueue.close();
                logger.info('Job queues ready');
            })
            .catch(() => {
                queuesAvailable = false;
                logger.warn('Job queues not available (Redis required)');
            });
    } catch (e) {
        queuesAvailable = false;
        logger.warn('Job queues not available');
    }
};

const getDocumentQueue = () => {
    if (!queuesAvailable) return null;
    if (documentQueue) return documentQueue;

    documentQueue = new Bull('document-processing', {
        redis: redisConfig,
    });

    documentQueue.process(async (job) => {
        const { type, documentId } = job.data;
        if (type === 'analyze') {
            logger.info(`Analyzing document ${documentId} in background`);
            // Placeholder for heavy processing: indexing, summarization, etc.
        }
    });

    documentQueue.on('error', (err) => {
        logger.warn(`Document queue Redis error: ${err.message}`);
    });

    logger.info('Document processing queue ready');
    return documentQueue;
};

const enqueueDocumentJob = async (type, payload) => {
    const queue = getDocumentQueue();
    if (!queue) return;
    await queue.add(
        type,
        payload,
        {
            removeOnComplete: true,
            removeOnFail: true,
        }
    );
};

const getAnalyticsQueue = () => {
    if (!queuesAvailable) return null;
    if (analyticsQueue) return analyticsQueue;

    analyticsQueue = new Bull('analytics-events', {
        redis: redisConfig,
    });

    analyticsQueue.process(async (job) => {
        const { event } = job.data;
        // Simulated stream processing: mark as processed or perform additional aggregation
        logger.debug(`Processed analytics event ${event.eventType} for tenant ${event.tenantId}`);
    });

    analyticsQueue.on('error', (err) => {
        logger.warn(`Analytics queue Redis error: ${err.message}`);
    });

    logger.info('Analytics events queue ready');
    return analyticsQueue;
};

const enqueueAnalyticsEvent = async (event) => {
    const queue = getAnalyticsQueue();
    if (!queue) return;
    await queue.add(
        'analytics',
        { event },
        {
            removeOnComplete: true,
            removeOnFail: true,
        }
    );
};

export { setupRecurringJobs, enqueueDocumentJob, enqueueAnalyticsEvent };
