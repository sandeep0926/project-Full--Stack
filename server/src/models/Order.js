const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            index: true,
        },

        // Items
        items: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
                name: String,
                sku: String,
                quantity: { type: Number, required: true, min: 1 },
                price: { type: Number, required: true },
                total: { type: Number, required: true },
                variant: String,
            },
        ],

        // Pricing
        subtotal: { type: Number, required: true },
        tax: { type: Number, default: 0 },
        shipping: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, required: true },

        // Coupon
        couponCode: String,
        couponDiscount: { type: Number, default: 0 },

        // Shipping address
        shippingAddress: {
            firstName: String,
            lastName: String,
            address1: String,
            address2: String,
            city: String,
            state: String,
            postalCode: String,
            country: String,
            phone: String,
        },

        // Billing address
        billingAddress: {
            firstName: String,
            lastName: String,
            address1: String,
            address2: String,
            city: String,
            state: String,
            postalCode: String,
            country: String,
        },

        // Payment
        payment: {
            method: {
                type: String,
                enum: ['stripe', 'paypal', 'cod'],
                default: 'stripe',
            },
            stripePaymentIntentId: String,
            stripeChargeId: String,
            status: {
                type: String,
                enum: ['pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'],
                default: 'pending',
            },
            paidAt: Date,
        },

        // Order status
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled', 'returned'],
            default: 'pending',
        },
        statusHistory: [
            {
                status: String,
                changedAt: { type: Date, default: Date.now },
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                note: String,
            },
        ],

        // Shipping
        tracking: {
            carrier: String,
            trackingNumber: String,
            estimatedDelivery: Date,
            shippedAt: Date,
            deliveredAt: Date,
        },

        // Inventory lock
        inventoryLocked: { type: Boolean, default: false },
        inventoryLockExpires: Date,

        notes: String,
        isGift: { type: Boolean, default: false },
        giftMessage: String,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: -1 });

// Generate order number
orderSchema.pre('save', async function (next) {
    if (this.isNew && !this.orderNumber) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.orderNumber = `ORD-${timestamp}-${random}`;
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);
