const express = require('express');
const router = express.Router();
const passport = require('passport');
const auth = require('../../controllers/authController');
const { authenticate } = require('../../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../../middleware/rateLimiter');
const { registerRules, loginRules, validate } = require('../../middleware/validate');

router.post('/register', authLimiter, registerRules, validate, auth.register);
router.post('/login', authLimiter, loginRules, validate, auth.login);
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

module.exports = router;
