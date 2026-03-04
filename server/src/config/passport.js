import passport from 'passport';
import passportGoogle from 'passport-google-oauth20';
const GoogleStrategy = passportGoogle.Strategy;
import pkg from 'passport-jwt';
const { Strategy: JwtStrategy, ExtractJwt } = pkg;
import User from '../models/User.js';
import logger from '../utils/logger.js';

// JWT Strategy
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
};

passport.use(
    new JwtStrategy(jwtOptions, async (payload, done) => {
        try {
            const user = await User.findById(payload.id).select('-password');
            if (!user) {
                return done(null, false);
            }
            if (user.isLocked) {
                return done(null, false, { message: 'Account is locked' });
            }
            // Single-session enforcement: reject tokens from older sessions
            if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
                return done(null, false, { message: 'Session expired. Please login again.' });
            }
            return done(null, user);
        } catch (error) {
            return done(error, false);
        }
    })
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
                scope: ['profile', 'email'],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    let user = await User.findOne({ googleId: profile.id });

                    if (user) {
                        user.lastLogin = new Date();
                        await user.save();
                        return done(null, user);
                    }

                    // Check if email already exists
                    user = await User.findOne({ email: profile.emails[0].value });

                    if (user) {
                        user.googleId = profile.id;
                        user.avatar = profile.photos[0]?.value;
                        user.lastLogin = new Date();
                        await user.save();
                        return done(null, user);
                    }

                    // Create new user
                    user = await User.create({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        googleId: profile.id,
                        avatar: profile.photos[0]?.value,
                        isEmailVerified: true,
                        provider: 'google',
                    });

                    return done(null, user);
                } catch (error) {
                    logger.error(`Google OAuth error: ${error.message}`);
                    return done(error, false);
                }
            }
        )
    );
}

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
