import 'dotenv/config';
import express from 'express';
import http from 'http';

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import swaggerUi from 'swagger-ui-express';
import { setupRecurringJobs } from './jobs/queues.js';

import connectDB from './config/database.js';
import { createRedisClient } from './config/redis.js';
import passportConfig from './config/passport.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import setupSocketHandlers from './sockets/documentSocket.js';
import setupAnalyticsSocket from './sockets/analyticsSocket.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './routes/v1/auth.js';
import tenantRoutes from './routes/v1/tenants.js';
import documentRoutes from './routes/v1/documents.js';
import productRoutes from './routes/v1/products.js';
import orderRoutes from './routes/v1/orders.js';
import analyticsRoutes from './routes/v1/analytics.js';
import billingRoutes from './routes/v1/billing.js';
import paymentRoutes from './routes/v1/payments.js';
import v2Routes from './routes/v2/index.js';
import paymentController from './controllers/paymentController.js';

const app = express();

// Stripe webhook must receive raw body for signature verification – register before express.json()
app.post(
    '/api/v1/payments/webhook',
    express.raw({ type: 'application/json' }),
    paymentController.handleWebhook
);
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'], credentials: true },
    pingTimeout: 60000,
});

// Enable horizontal scaling via Redis adapter (optional, off by default in dev)
if (process.env.ENABLE_SOCKET_REDIS === 'true') {
    try {
        const redisHost = process.env.REDIS_HOST || 'localhost';
        const redisPort = process.env.REDIS_PORT || 6379;
        const pubClient = new Redis({
            host: redisHost,
            port: redisPort,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
        });
        const subClient = pubClient.duplicate();

        pubClient.on('error', (err) => {
            logger.warn(`Socket.io Redis pubClient error: ${err.message}`);
        });
        subClient.on('error', (err) => {
            logger.warn(`Socket.io Redis subClient error: ${err.message}`);
        });

        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter enabled for horizontal scaling');
    } catch (e) {
        logger.warn('Socket.io Redis adapter not enabled');
    }
} else {
    logger.info('Socket.io Redis adapter disabled (ENABLE_SOCKET_REDIS != "true")');
}

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(hpp());
app.use(mongoSanitize());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: logger.stream }));
}

// Passport
app.use(passportConfig.initialize());

// Rate limiting
app.use('/api/', apiLimiter);

// Swagger – use static OpenAPI spec so docs always show (no JSDoc scan dependency)
const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
const openApiSpec = {
    openapi: '3.0.0',
    info: { title: 'Enterprise Platform API', version: '1.0.0', description: 'Full-stack enterprise platform API documentation' },
    servers: [{ url: baseUrl }],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
    },
    security: [{ bearerAuth: [] }],
    paths: {
        '/api/v1/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Register a new user',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'email', 'password'],
                                properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string' } },
                            },
                        },
                    },
                },
                responses: { 201: { description: 'User registered' }, 409: { description: 'Email already exists' } },
            },
        },
        '/api/v1/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Login with email and password',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Logged in' }, 401: { description: 'Invalid credentials' } },
            },
        },
        '/api/v1/auth/me': {
            get: {
                tags: ['Auth'],
                summary: 'Get current user',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'Current user' }, 401: { description: 'Unauthorized' } },
            },
        },
        '/api/v1/auth/refresh-token': {
            post: {
                tags: ['Auth'],
                summary: 'Refresh access token',
                requestBody: {
                    content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } },
                },
                responses: { 200: { description: 'New tokens' }, 401: { description: 'Invalid refresh token' } },
            },
        },
        '/api/v1/products': {
            get: {
                tags: ['Products'],
                summary: 'List products',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer' } },
                    { name: 'limit', in: 'query', schema: { type: 'integer' } },
                    { name: 'search', in: 'query', schema: { type: 'string' } },
                    { name: 'category', in: 'query', schema: { type: 'string' } },
                ],
                responses: { 200: { description: 'List of products' } },
            },
        },
        '/api/v1/orders': {
            get: {
                tags: ['Orders'],
                summary: 'List orders',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer' } },
                    { name: 'status', in: 'query', schema: { type: 'string' } },
                ],
                responses: { 200: { description: 'List of orders' }, 401: { description: 'Unauthorized' } },
            },
        },
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Health check',
                security: [],
                responses: { 200: { description: 'OK' } },
            },
        },
    },
};
// Serve OpenAPI spec at a path that does NOT start with /api-docs (so app.use('/api-docs') doesn't catch it)
app.get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
});
// Serve OpenAPI UI – use static object directly for reliability
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Enterprise API Documentation',
}));

logger.info('Swagger UI available at /api-docs');

// API Routes v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/payments', paymentRoutes);

// API Routes v2
app.use('/api/v2', v2Routes);

// Health check
app.get('/health', (req, res) => {
    res.json({ success: true, data: { status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString(), version: '1.0.0' } });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// WebSocket handlers
setupSocketHandlers(io);
setupAnalyticsSocket(io);

// Export io for use in controllers
export { io };

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        try {
            const redis = createRedisClient();
            await redis.connect();
            await redis.ping();
            logger.info('Redis connected');
        } catch (e) { logger.warn('Redis not available - running without cache'); }

        try {
            setupRecurringJobs();
        } catch (e) { logger.warn('Job queues not available'); }

        server.listen(PORT, () => {
            logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
            logger.info(`API Docs: http://localhost:${PORT}/api-docs`);
        });
    } catch (error) {
        logger.error(`Server startup failed: ${error.message}`);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => { logger.info('SIGTERM received. Shutting down...'); server.close(() => process.exit(0)); });
process.on('unhandledRejection', (err) => { logger.error(`Unhandled Rejection: ${err.message}`); });

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export { app, server };
