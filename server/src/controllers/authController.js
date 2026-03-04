import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateSecureToken, hashToken } from '../utils/tokens.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendOTPEmail, sendLoginNotificationEmail, sendWelcomeEmail } from '../utils/email.js';
import { sendSms } from '../utils/sms.js';
import { AuthenticationError, ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import speakeasy from 'speakeasy';
import logger from '../utils/logger.js';

// @desc Register user
// @route POST /api/v1/auth/register
export const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }

        // Create user
        const user = await User.create({ name, email, password });

        // Generate email verification token
        const verifyToken = generateSecureToken();
        user.emailVerificationToken = hashToken(verifyToken);
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        // Start session versioning at 1 for new users
        user.tokenVersion = 1;
        await user.save();

        // Send verification email (non-blocking)
        sendVerificationEmail(user, verifyToken).catch((err) =>
            logger.error(`Verification email failed: ${err.message}`)
        );

        // Send welcome email (non-blocking)
        sendWelcomeEmail(user).catch((err) =>
            logger.error(`Welcome email failed: ${err.message}`)
        );

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Audit log
        await AuditLog.logAction({
            user: user._id,
            action: 'USER_REGISTER',
            category: 'auth',
            description: 'User registered',
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Login user
// @route POST /api/v1/auth/login
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password +otpCode +otpExpires +mfaSecret');
        if (!user) {
            throw new AuthenticationError('Invalid credentials');
        }

        // Check if account is locked
        if (user.isAccountLocked) {
            const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
            throw new AuthenticationError(`Account is locked. Try again in ${remainingTime} minutes`);
        }

        // Check password
        if (user.provider === 'google' && !user.password) {
            throw new AuthenticationError('Please use Google sign-in for this account');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            await user.incrementLoginAttempts();
            throw new AuthenticationError('Invalid credentials');
        }

        // Check MFA
        if (user.mfaEnabled) {
            // Generate OTP and send via email/SMS
            const otp = speakeasy.totp({
                secret: user.mfaSecret || speakeasy.generateSecret().base32,
                encoding: 'base32',
                step: 300, // 5 minutes
            });

            user.otpCode = hashToken(otp);
            user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
            await user.save();

            // For development: log OTP to terminal so you can see it
            if (process.env.NODE_ENV !== 'production') {
                logger.info(`MFA OTP for ${user.email}: ${otp}`);
            }

            sendOTPEmail(user, otp).catch((err) =>
                logger.error(`OTP email failed: ${err.message}`)
            );

            if (user.phoneNumber) {
                sendSms({
                    to: user.phoneNumber,
                    body: `Your Enterprise Platform OTP is ${otp}. It expires in 5 minutes.`,
                }).catch((err) =>
                    logger.error(`OTP SMS failed: ${err.message}`)
                );
            }

            return res.status(200).json({
                success: true,
                data: {
                    requiresMFA: true,
                    userId: user._id,
                    message: 'OTP sent to your email/SMS',
                },
            });
        }

        // Invalidate other sessions and reset login attempts
        user.tokenVersion += 1;
        await user.resetLoginAttempts();

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Track device
        const deviceInfo = {
            deviceId: req.headers['x-device-id'] || generateSecureToken(16),
            deviceName: req.headers['x-device-name'] || 'Unknown Device',
            browser: req.get('user-agent'),
            ip: req.ip,
            lastActive: new Date(),
            refreshToken: hashToken(refreshToken),
        };

        // Keep only last 5 devices
        if (user.devices.length >= 5) {
            user.devices.shift();
        }
        user.devices.push(deviceInfo);
        await user.save();

        // Audit log
        await AuditLog.logAction({
            user: user._id,
            tenantId: user.tenantId,
            action: 'USER_LOGIN',
            category: 'auth',
            description: 'User logged in',
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        // Send login notification email (non-blocking)
        sendLoginNotificationEmail(user, {
            ip: req.ip,
            browser: req.get('user-agent'),
        }).catch((err) =>
            logger.error(`Login notification email failed: ${err.message}`)
        );

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    tenantId: user.tenantId,
                    subscription: user.subscription,
                    avatar: user.avatar,
                    isEmailVerified: user.isEmailVerified,
                    mfaEnabled: user.mfaEnabled,
                },
                accessToken,
                refreshToken,
                deviceId: deviceInfo.deviceId,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Verify MFA OTP
// @route POST /api/v1/auth/verify-mfa
export const verifyMFA = async (req, res, next) => {
    try {
        const { userId, otp } = req.body;

        const user = await User.findById(userId).select('+otpCode +otpExpires');
        if (!user) {
            throw new NotFoundError('User');
        }

        if (!user.otpCode || user.otpExpires < Date.now()) {
            throw new AuthenticationError('OTP has expired. Please login again.');
        }

        const hashedOtp = hashToken(otp);
        if (hashedOtp !== user.otpCode) {
            await user.incrementLoginAttempts();
            throw new AuthenticationError('Invalid OTP');
        }

        // Clear OTP
        user.otpCode = undefined;
        user.otpExpires = undefined;
        // Invalidate other sessions and finalize login
        user.tokenVersion += 1;
        await user.resetLoginAttempts();

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Enable MFA
// @route POST /api/v1/auth/enable-mfa
export const enableMFA = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        const secret = speakeasy.generateSecret({ name: `EnterprisePlatform:${user.email}` });

        user.mfaSecret = secret.base32;
        user.mfaEnabled = true;
        user.mfaBackupCodes = Array.from({ length: 8 }, () => generateSecureToken(4));
        await user.save();

        await AuditLog.logAction({
            user: user._id,
            action: 'MFA_ENABLE',
            category: 'auth',
            description: 'MFA enabled',
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(200).json({
            success: true,
            data: {
                message: 'MFA enabled successfully',
                backupCodes: user.mfaBackupCodes,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Refresh token
// @route POST /api/v1/auth/refresh-token
export const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: token } = req.body;
        if (!token) {
            throw new AuthenticationError('Refresh token is required');
        }

        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.id);

        if (!user) {
            throw new AuthenticationError('Invalid refresh token');
        }

        // Check token version for rotation
        if (decoded.tokenVersion !== user.tokenVersion) {
            throw new AuthenticationError('Token has been revoked');
        }

        // Rotate refresh token
        user.tokenVersion += 1;
        await user.save();

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        res.status(200).json({
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Forgot password
// @route POST /api/v1/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if email exists
            return res.status(200).json({
                success: true,
                data: { message: 'If an account exists, a reset email has been sent' },
            });
        }

        const resetToken = generateSecureToken();
        user.passwordResetToken = hashToken(resetToken);
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        sendPasswordResetEmail(user, resetToken).catch((err) =>
            logger.error(`Password reset email failed: ${err.message}`)
        );

        res.status(200).json({
            success: true,
            data: { message: 'If an account exists, a reset email has been sent' },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Reset password
// @route PUT /api/v1/auth/reset-password/:token
export const resetPassword = async (req, res, next) => {
    try {
        const hashedToken = hashToken(req.params.token);

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            throw new AuthenticationError('Invalid or expired reset token');
        }

        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.tokenVersion += 1; // Invalidate all existing tokens
        await user.save();

        await AuditLog.logAction({
            user: user._id,
            action: 'PASSWORD_RESET',
            category: 'auth',
            description: 'Password reset completed',
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(200).json({
            success: true,
            data: { message: 'Password reset successful' },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Verify email
// @route GET /api/v1/auth/verify-email/:token
export const verifyEmail = async (req, res, next) => {
    try {
        const hashedToken = hashToken(req.params.token);

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() },
        });

        if (!user) {
            throw new AuthenticationError('Invalid or expired verification token');
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            data: { message: 'Email verified successfully' },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get current user
// @route GET /api/v1/auth/me
export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).populate('tenantId', 'name slug');

        res.status(200).json({
            success: true,
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Logout
// @route POST /api/v1/auth/logout
export const logout = async (req, res, next) => {
    try {
        const { deviceId } = req.body;

        if (deviceId && req.user) {
            const user = await User.findById(req.user._id);
            user.devices = user.devices.filter((d) => d.deviceId !== deviceId);
            await user.save();

            await AuditLog.logAction({
                user: user._id,
                action: 'USER_LOGOUT',
                category: 'auth',
                description: 'User logged out',
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
        }

        res.status(200).json({
            success: true,
            data: { message: 'Logged out successfully' },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get user devices
// @route GET /api/v1/auth/devices
export const getDevices = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        const devices = user.devices.map((d) => ({
            deviceId: d.deviceId,
            deviceName: d.deviceName,
            browser: d.browser,
            os: d.os,
            ip: d.ip,
            lastActive: d.lastActive,
        }));

        res.status(200).json({
            success: true,
            data: { devices },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Revoke device
// @route DELETE /api/v1/auth/devices/:deviceId
export const revokeDevice = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        user.devices = user.devices.filter((d) => d.deviceId !== req.params.deviceId);
        await user.save();

        res.status(200).json({
            success: true,
            data: { message: 'Device revoked' },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Google OAuth callback
// @route GET /api/v1/auth/google/callback
export const googleCallback = async (req, res, next) => {
    try {
        const user = req.user;
        // Invalidate other sessions
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await AuditLog.logAction({
            user: user._id,
            action: 'USER_LOGIN',
            category: 'auth',
            description: 'User logged in via Google OAuth',
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        // Send login notification email (non-blocking) for Google sign-in as well
        sendLoginNotificationEmail(user, {
            ip: req.ip,
            browser: req.get('user-agent'),
        }).catch((err) =>
            logger.error(`Google login notification email failed: ${err.message}`)
        );

        // Redirect to frontend with tokens
        res.redirect(
            `${process.env.CLIENT_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
        );
    } catch (error) {
        next(error);
    }
};

export default {
    register,
    login,
    verifyMFA,
    enableMFA,
    refreshToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getMe,
    logout,
    getDevices,
    revokeDevice,
    googleCallback,
};
