import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema(
    {
        eventType: {
            type: String,
            required: true,
            enum: [
                'page_view', 'user_signup', 'user_login', 'purchase',
                'add_to_cart', 'remove_from_cart', 'checkout_start',
                'search', 'product_view', 'document_view', 'document_edit',
                'api_call', 'error', 'custom',
            ],
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            index: true,
        },
        sessionId: String,

        // Event data
        metadata: mongoose.Schema.Types.Mixed,

        // Page / URL info
        page: String,
        referrer: String,
        url: String,

        // Device info
        device: {
            type: { type: String, enum: ['desktop', 'mobile', 'tablet'] },
            browser: String,
            os: String,
            screenResolution: String,
        },

        // Geo info
        geo: {
            country: String,
            region: String,
            city: String,
            ip: String,
        },

        // E-commerce specific
        revenue: Number,
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

        // Performance
        duration: Number, // in ms
        responseTime: Number,

        // Processing status
        processed: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for analytics queries
analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ tenantId: 1, eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ userId: 1, eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ 'device.type': 1, createdAt: -1 });
analyticsEventSchema.index({ 'geo.country': 1, createdAt: -1 });

// TTL - auto-delete events older than 1 year
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);
