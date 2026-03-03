require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/database');
const { createRedisClient } = require('./config/redis');
const passportConfig = require('./config/passport');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const setupSocketHandlers = require('./sockets/documentSocket');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/v1/auth');
const tenantRoutes = require('./routes/v1/tenants');
const documentRoutes = require('./routes/v1/documents');
const productRoutes = require('./routes/v1/products');
const orderRoutes = require('./routes/v1/orders');
const analyticsRoutes = require('./routes/v1/analytics');
const v2Routes = require('./routes/v2/index');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'], credentials: true },
    pingTimeout: 60000,
});

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

// Swagger
let swaggerUi, swaggerSpec;
try {
    swaggerUi = require('swagger-ui-express');
    const swaggerJsdoc = require('swagger-jsdoc');
    swaggerSpec = swaggerJsdoc({
        definition: {
            openapi: '3.0.0',
            info: { title: 'Enterprise Platform API', version: '1.0.0', description: 'Full-stack enterprise platform API documentation' },
            servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
            components: {
                securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
            },
            security: [{ bearerAuth: [] }],
        },
        apis: ['./src/routes/**/*.js'],
    });
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Enterprise Platform API' }));
} catch (e) { logger.warn('Swagger not configured'); }

// API Routes v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

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
            const { setupRecurringJobs } = require('./jobs/queues');
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

module.exports = { app, server };
