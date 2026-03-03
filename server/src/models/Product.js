const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            maxlength: [200, 'Product name cannot exceed 200 characters'],
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        description: {
            type: String,
            required: [true, 'Product description is required'],
        },
        shortDescription: String,
        sku: {
            type: String,
            required: true,
            unique: true,
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        compareAtPrice: Number,
        costPrice: Number,

        // Images
        images: [
            {
                url: String,
                alt: String,
                isPrimary: { type: Boolean, default: false },
            },
        ],

        // Categorization
        category: {
            type: String,
            required: true,
            index: true,
        },
        subcategory: String,
        tags: [String],
        brand: String,

        // Inventory
        inventory: {
            quantity: { type: Number, required: true, min: 0, default: 0 },
            reserved: { type: Number, default: 0 },
            lowStockThreshold: { type: Number, default: 10 },
            trackInventory: { type: Boolean, default: true },
        },

        // Variants
        variants: [
            {
                name: String,
                sku: String,
                price: Number,
                inventory: { type: Number, default: 0 },
                attributes: mongoose.Schema.Types.Mixed,
            },
        ],

        // Attributes
        attributes: mongoose.Schema.Types.Mixed,
        weight: Number,
        dimensions: {
            length: Number,
            width: Number,
            height: Number,
        },

        // SEO
        seo: {
            title: String,
            description: String,
            keywords: [String],
        },

        // Status
        status: {
            type: String,
            enum: ['draft', 'active', 'archived', 'out_of_stock'],
            default: 'draft',
            index: true,
        },
        isPublished: { type: Boolean, default: false },
        publishedAt: Date,

        // Ratings
        ratings: {
            average: { type: Number, default: 0 },
            count: { type: Number, default: 0 },
        },

        // Tenant
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Compound indexes for performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1, price: 1 });
productSchema.index({ tenantId: 1, status: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ 'inventory.quantity': 1, 'inventory.lowStockThreshold': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'ratings.average': -1 });

// Virtual for available quantity
productSchema.virtual('availableQuantity').get(function () {
    return Math.max(0, this.inventory.quantity - this.inventory.reserved);
});

// Virtual for low stock status
productSchema.virtual('isLowStock').get(function () {
    return this.inventory.quantity <= this.inventory.lowStockThreshold;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function () {
    if (this.compareAtPrice && this.compareAtPrice > this.price) {
        return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
    }
    return 0;
});

module.exports = mongoose.model('Product', productSchema);
