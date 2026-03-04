import express from 'express';
const router = express.Router();
import passport from 'passport';
import auth from '../../controllers/authController.js';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../../middleware/rateLimiter.js';
import { registerRules, loginRules, validate } from '../../middleware/validate.js';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user account management
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: User with this email already exists
 */

router.post('/register', authLimiter, registerRules, validate, auth.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, loginRules, validate, auth.login);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 *       401:
 *         description: Unauthorized
 */
router.post('/verify-mfa', authLimiter, auth.verifyMFA);
router.post('/refresh-token', auth.refreshToken);
router.post('/forgot-password', passwordResetLimiter, auth.forgotPassword);
router.put('/reset-password/:token', auth.resetPassword);
router.get('/verify-email/:token', auth.verifyEmail);
router.get('/me', authenticate, auth.getMe);
router.post('/logout', authenticate, auth.logout);
router.post('/enable-mfa', authenticate, auth.enableMFA);
router.get('/devices', authenticate, auth.getDevices);
router.delete('/devices/:deviceId', authenticate, auth.revokeDevice);

// Google OAuth (only if configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
    router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), auth.googleCallback);
}

export default router;
