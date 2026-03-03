import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            minlength: [8, 'Password must be at least 8 characters'],
            select: false,
        },
        role: {
            type: String,
            enum: ['user', 'admin', 'superadmin'],
            default: 'user',
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            index: true,
        },
        avatar: String,
        phone: String,
        provider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
        },
        googleId: String,

        // Email verification
        isEmailVerified: { type: Boolean, default: false },
        emailVerificationToken: String,
        emailVerificationExpires: Date,

        // Password reset
        passwordResetToken: String,
        passwordResetExpires: Date,

        // MFA
        mfaEnabled: { type: Boolean, default: false },
        mfaSecret: { type: String, select: false },
        mfaBackupCodes: [{ type: String, select: false }],

        // OTP
        otpCode: { type: String, select: false },
        otpExpires: { type: Date, select: false },

        // Security
        tokenVersion: { type: Number, default: 0 },
        failedLoginAttempts: { type: Number, default: 0 },
        lockUntil: Date,
        isLocked: { type: Boolean, default: false },
        lastLogin: Date,
        lastPasswordChange: Date,

        // Session/Device tracking
        devices: [
            {
                deviceId: String,
                deviceName: String,
                browser: String,
                os: String,
                ip: String,
                lastActive: Date,
                refreshToken: { type: String, select: false },
            },
        ],

        // Subscription
        subscription: {
            plan: {
                type: String,
                enum: ['free', 'starter', 'professional', 'enterprise'],
                default: 'free',
            },
            stripeCustomerId: String,
            stripeSubscriptionId: String,
            status: {
                type: String,
                enum: ['active', 'canceled', 'past_due', 'trialing', 'inactive'],
                default: 'active',
            },
            currentPeriodEnd: Date,
        },

        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ googleId: 1 }, { sparse: true });

// Virtual for lock status
userSchema.virtual('isAccountLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.lastPasswordChange = new Date();
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Increment failed login attempts
userSchema.methods.incrementLoginAttempts = async function () {
    const MAX_ATTEMPTS = 5;
    const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

    this.failedLoginAttempts += 1;

    if (this.failedLoginAttempts >= MAX_ATTEMPTS) {
        this.isLocked = true;
        this.lockUntil = new Date(Date.now() + LOCK_TIME);
    }

    await this.save();
};

// Reset failed login attempts
userSchema.methods.resetLoginAttempts = async function () {
    this.failedLoginAttempts = 0;
    this.isLocked = false;
    this.lockUntil = undefined;
    this.lastLogin = new Date();
    await this.save();
};

// Increment token version (invalidate all refresh tokens)
userSchema.methods.incrementTokenVersion = async function () {
    this.tokenVersion += 1;
    await this.save();
};

export default mongoose.model('User', userSchema);
