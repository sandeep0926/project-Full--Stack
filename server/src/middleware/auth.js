const passport = require('passport');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { cacheGet } = require('../config/redis');

// Authenticate using JWT
const authenticate = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            return next(new AuthenticationError(info?.message || 'Please login to access this resource'));
        }
        req.user = user;
        next();
    })(req, res, next);
};

// Authorize based on roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AuthenticationError('Please login first'));
        }
        if (!roles.includes(req.user.role)) {
            return next(
                new AuthorizationError(`Role '${req.user.role}' is not authorized to access this resource`)
            );
        }
        next();
    };
};

// Check subscription plan
const requireSubscription = (...plans) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AuthenticationError('Please login first'));
        }
        const userPlan = req.user.subscription?.plan || 'free';
        if (!plans.includes(userPlan)) {
            return next(
                new AuthorizationError(`This feature requires one of the following plans: ${plans.join(', ')}`)
            );
        }
        next();
    };
};

// Check feature access
const requireFeature = (feature) => {
    return async (req, res, next) => {
        if (!req.user) {
            return next(new AuthenticationError('Please login first'));
        }
        try {
            const Tenant = require('../models/Tenant');
            const tenant = await Tenant.findById(req.user.tenantId);
            if (!tenant) {
                return next(new AuthorizationError('Tenant not found'));
            }
            if (!tenant.settings.features.includes(feature)) {
                return next(
                    new AuthorizationError(`Feature '${feature}' is not available in your current plan`)
                );
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};

// Tenant isolation middleware
const tenantIsolation = (req, res, next) => {
    if (!req.user) {
        return next(new AuthenticationError('Please login first'));
    }
    // Super admin bypasses tenant isolation
    if (req.user.role === 'superadmin') {
        return next();
    }
    // Set tenant filter for all queries
    req.tenantFilter = { tenantId: req.user.tenantId };
    next();
};

// Optional authentication (for public + authenticated endpoints)
const optionalAuth = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (user) req.user = user;
        next();
    })(req, res, next);
};

module.exports = {
    authenticate,
    authorize,
    requireSubscription,
    requireFeature,
    tenantIsolation,
    optionalAuth,
};
