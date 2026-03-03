const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    // Log error
    logger.error(`${err.message}`, {
        statusCode: error.statusCode || 500,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        error.message = `Resource not found with id: ${err.value}`;
        error.statusCode = 404;
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        error.message = `Duplicate value for field: ${field}. Please use another value.`;
        error.statusCode = 400;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((val) => val.message);
        error.message = messages.join('. ');
        error.statusCode = 400;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token. Please login again.';
        error.statusCode = 401;
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token has expired. Please login again.';
        error.statusCode = 401;
    }

    const statusCode = error.statusCode || err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        error: {
            message: error.message || 'Internal Server Error',
            code: error.errorCode || 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        },
    });
};

// Handle 404 for non-existent routes
const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.originalUrl} not found`,
            code: 'ROUTE_NOT_FOUND',
        },
    });
};

module.exports = { errorHandler, notFound };
