import { verifyAccessToken } from '../utils/tokens.js';
import logger from '../utils/logger.js';

/**
 * Setup Analytics WebSocket namespace for real-time analytics events
 * @param {Server} io - Socket.io server instance
 * @returns {Namespace} Analytics namespace
 */
export const setupAnalyticsSocket = (io) => {
    // Create analytics namespace
    const analyticsNamespace = io.of('/analytics');
    
    // Authentication middleware
    analyticsNamespace.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            
            if (!token) {
                return next(new Error('Authentication required'));
            }
            
            const decoded = verifyAccessToken(token);
            socket.userId = decoded.id;
            socket.tenantId = decoded.tenantId;
            socket.userEmail = decoded.email;
            socket.userName = decoded.name || decoded.email;
            socket.userRole = decoded.role;
            
            next();
        } catch (err) {
            logger.error(`Analytics socket auth error: ${err.message}`);
            next(new Error('Invalid or expired token'));
        }
    });
    
    // Connection handler
    analyticsNamespace.on('connection', (socket) => {
        logger.info(`Analytics socket connected: ${socket.userId} (${socket.userEmail})`);
        
        // Join tenant-specific room for data isolation
        const tenantRoom = `tenant:${socket.tenantId}`;
        socket.join(tenantRoom);
        
        // Subscribe to specific event types
        socket.on('subscribe', (eventTypes) => {
            if (Array.isArray(eventTypes) && eventTypes.length > 0) {
                socket.eventTypes = eventTypes;
                logger.debug(`User ${socket.userId} subscribed to: ${eventTypes.join(', ')}`);
                socket.emit('subscribed', { eventTypes });
            } else {
                // Subscribe to all events if no specific types provided
                socket.eventTypes = [];
                socket.emit('subscribed', { eventTypes: 'all' });
            }
        });
        
        // Unsubscribe from event types
        socket.on('unsubscribe', () => {
            socket.eventTypes = [];
            socket.emit('unsubscribed');
            logger.debug(`User ${socket.userId} unsubscribed from analytics events`);
        });
        
        // Request current stats
        socket.on('request-stats', async () => {
            try {
                // This would typically fetch current stats from database
                // For now, just acknowledge
                socket.emit('stats-update', {
                    timestamp: new Date().toISOString(),
                    message: 'Stats requested'
                });
            } catch (error) {
                logger.error(`Error fetching stats: ${error.message}`);
                socket.emit('error', { message: 'Failed to fetch stats' });
            }
        });
        
        // Disconnect handler
        socket.on('disconnect', (reason) => {
            logger.info(`Analytics socket disconnected: ${socket.userId} - ${reason}`);
            socket.leave(tenantRoom);
        });
        
        // Error handler
        socket.on('error', (error) => {
            logger.error(`Analytics socket error for ${socket.userId}: ${error.message}`);
        });
        
        // Send welcome message
        socket.emit('connected', {
            message: 'Connected to analytics stream',
            userId: socket.userId,
            tenantId: socket.tenantId
        });
    });
    
    logger.info('Analytics WebSocket namespace initialized');
    return analyticsNamespace;
};

/**
 * Emit analytics event to connected clients
 * @param {Server} io - Socket.io server instance
 * @param {Object} event - Analytics event object
 */
export const emitAnalyticsEvent = (io, event) => {
    if (!event || !event.tenantId) {
        logger.warn('Cannot emit analytics event: missing tenantId');
        return;
    }
    
    const analyticsNamespace = io.of('/analytics');
    const tenantRoom = `tenant:${event.tenantId}`;
    
    // Get all sockets in the tenant room
    const socketsInRoom = analyticsNamespace.adapter.rooms.get(tenantRoom);
    
    if (!socketsInRoom || socketsInRoom.size === 0) {
        // No clients listening, skip emission
        return;
    }
    
    // Emit to all clients in tenant room
    analyticsNamespace.to(tenantRoom).emit('analytics-event', {
        eventType: event.eventType,
        userId: event.userId,
        timestamp: event.createdAt || event.timestamp || new Date().toISOString(),
        page: event.page,
        revenue: event.revenue,
        device: event.device,
        geo: event.geo,
        metadata: event.metadata,
        _id: event._id || event.id
    });
    
    logger.debug(`Emitted ${event.eventType} event to ${socketsInRoom.size} client(s) in ${tenantRoom}`);
};

/**
 * Broadcast dashboard update to all clients in a tenant
 * @param {Server} io - Socket.io server instance
 * @param {String} tenantId - Tenant ID
 * @param {Object} data - Dashboard data to broadcast
 */
export const broadcastDashboardUpdate = (io, tenantId, data) => {
    if (!tenantId) {
        logger.warn('Cannot broadcast dashboard update: missing tenantId');
        return;
    }
    
    const analyticsNamespace = io.of('/analytics');
    const tenantRoom = `tenant:${tenantId}`;
    
    analyticsNamespace.to(tenantRoom).emit('dashboard-update', {
        timestamp: new Date().toISOString(),
        ...data
    });
    
    logger.debug(`Broadcast dashboard update to ${tenantRoom}`);
};

export default setupAnalyticsSocket;
