import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Tenant name is required'],
            trim: true,
            unique: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        description: String,
        logo: String,
        domain: String,

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
            currentPeriodStart: Date,
            currentPeriodEnd: Date,
        },

        // Settings
        settings: {
            allowPublicSignup: { type: Boolean, default: false },
            requireMFA: { type: Boolean, default: false },
            maxUsers: { type: Number, default: 1 },
            maxProjects: { type: Number, default: 1 },
            features: [String],
            branding: {
                primaryColor: { type: String, default: '#6366f1' },
                logo: String,
                favicon: String,
            },
        },

        // Members
        members: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                role: {
                    type: String,
                    enum: ['owner', 'admin', 'member', 'viewer'],
                    default: 'member',
                },
                joinedAt: { type: Date, default: Date.now },
                invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            },
        ],

        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
tenantSchema.index({ slug: 1 });
tenantSchema.index({ owner: 1 });
tenantSchema.index({ 'members.user': 1 });
tenantSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });

// Virtual member count
tenantSchema.virtual('memberCount').get(function () {
    return this.members ? this.members.length : 0;
});

export default mongoose.model('Tenant', tenantSchema);
