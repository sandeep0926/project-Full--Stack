const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const auditMiddleware = (action, category) => {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        res.json = function (body) {
            // Log after response
            const status = res.statusCode < 400 ? 'success' : 'failure';

            AuditLog.logAction({
                user: req.user?._id,
                tenantId: req.user?.tenantId,
                action,
                category,
                description: `${action} - ${req.method} ${req.originalUrl}`,
                metadata: {
                    method: req.method,
                    path: req.originalUrl,
                    statusCode: res.statusCode,
                    body: sanitizeBody(req.body),
                    params: req.params,
                    query: req.query,
                },
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('user-agent'),
                status,
                resourceType: getResourceType(req.originalUrl),
                resourceId: req.params?.id,
            }).catch((err) => {
                logger.error(`Audit log failed: ${err.message}`);
            });

            return originalJson(body);
        };

        next();
    };
};

// Remove sensitive fields from body before logging
const sanitizeBody = (body) => {
    if (!body) return {};
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn', 'mfaSecret'];
    sensitiveFields.forEach((field) => {
        if (sanitized[field]) sanitized[field] = '[REDACTED]';
    });
    return sanitized;
};

// Extract resource type from URL
const getResourceType = (url) => {
    const segments = url.split('/').filter(Boolean);
    // /api/v1/[resource] => resource
    return segments[2] || 'unknown';
};

module.exports = auditMiddleware;
