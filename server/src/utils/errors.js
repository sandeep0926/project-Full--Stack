class AppError extends Error {
    constructor(message, statusCode, errorCode = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Not authorized to access this resource') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests, please try again later') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}

export {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
};
