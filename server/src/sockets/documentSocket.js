const Document = require('../models/Document');
const { verifyAccessToken } = require('../utils/tokens');
const logger = require('../utils/logger');

const documentColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

const activeUsers = new Map(); // docId -> Map(userId -> userData)

const setupSocketHandlers = (io) => {
    // Auth middleware for sockets
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) return next(new Error('Authentication required'));
            const decoded = verifyAccessToken(token);
            socket.userId = decoded.id;
            socket.userEmail = decoded.email;
            socket.userName = decoded.name || decoded.email;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.userId}`);

        // Join document room
        socket.on('join-document', async (documentId) => {
            socket.join(documentId);
            socket.documentId = documentId;

            if (!activeUsers.has(documentId)) activeUsers.set(documentId, new Map());
            const docUsers = activeUsers.get(documentId);
            const colorIndex = docUsers.size % documentColors.length;
            const userData = { userId: socket.userId, name: socket.userName, color: documentColors[colorIndex], cursor: null };
            docUsers.set(socket.userId, userData);

            // Notify others
            socket.to(documentId).emit('user-joined', userData);
            // Send active users list
            socket.emit('active-users', Array.from(docUsers.values()));
            logger.info(`User ${socket.userId} joined document ${documentId}`);
        });

        // Handle text changes (Operational Transformation)
        socket.on('text-change', async (data) => {
            const { documentId, delta, source } = data;
            // Broadcast to other users in the document
            socket.to(documentId).emit('text-change', { delta, userId: socket.userId, source });
        });

        // Handle cursor position updates
        socket.on('cursor-change', (data) => {
            const { documentId, range } = data;
            const docUsers = activeUsers.get(documentId);
            if (docUsers?.has(socket.userId)) {
                docUsers.get(socket.userId).cursor = range;
            }
            socket.to(documentId).emit('cursor-change', { userId: socket.userId, range, name: socket.userName, color: docUsers?.get(socket.userId)?.color });
        });

        // Auto-save
        socket.on('save-document', async (data) => {
            try {
                const { documentId, content, plainText } = data;
                const doc = await Document.findById(documentId);
                if (doc) {
                    doc.content = content;
                    doc.plainText = plainText || '';
                    doc.lastEditedBy = socket.userId;
                    doc.wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
                    await doc.save();
                    socket.emit('save-success', { documentId, version: doc.currentVersion });
                    socket.to(documentId).emit('document-saved', { savedBy: socket.userName });
                }
            } catch (err) {
                socket.emit('save-error', { message: err.message });
                logger.error(`Save error: ${err.message}`);
            }
        });

        // Leave document
        socket.on('leave-document', (documentId) => {
            handleLeave(socket, documentId, io);
        });

        // Disconnect
        socket.on('disconnect', () => {
            if (socket.documentId) handleLeave(socket, socket.documentId, io);
            logger.info(`Socket disconnected: ${socket.userId}`);
        });
    });
};

function handleLeave(socket, documentId, io) {
    socket.leave(documentId);
    const docUsers = activeUsers.get(documentId);
    if (docUsers) {
        docUsers.delete(socket.userId);
        if (docUsers.size === 0) activeUsers.delete(documentId);
        io.to(documentId).emit('user-left', { userId: socket.userId });
        io.to(documentId).emit('active-users', Array.from(docUsers.values()));
    }
}

module.exports = setupSocketHandlers;
