import rateLimit from 'express-rate-limit';
import { RateLimitError } from '../utils/errors.js';

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: { success: false, error: { message: 'Too many requests, please try again later', code: 'RATE_LIMIT_EXCEEDED' } },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new RateLimitError());
    },
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: { message: 'Too many auth attempts, please try again in 15 minutes', code: 'AUTH_RATE_LIMIT' } },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

// Very strict limiter for password reset
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { success: false, error: { message: 'Too many password reset requests', code: 'PASSWORD_RESET_LIMIT' } },
});

// Upload rate limiter
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: { success: false, error: { message: 'Upload limit exceeded', code: 'UPLOAD_LIMIT' } },
});

export {
    apiLimiter,
    authLimiter,
    passwordResetLimiter,
    uploadLimiter,
};
