import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '15m' }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user._id, tokenVersion: user.tokenVersion || 0 },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

const generateSecureToken = (bytes = 32) => {
    return crypto.randomBytes(bytes).toString('hex');
};

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

export {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateSecureToken,
    hashToken,
};
