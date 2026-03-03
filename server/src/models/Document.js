const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Document title is required'],
            trim: true,
            default: 'Untitled Document',
        },
        content: {
            type: mongoose.Schema.Types.Mixed,
            default: { ops: [{ insert: '\n' }] },
        },
        plainText: {
            type: String,
            default: '',
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            index: true,
        },

        // Collaboration
        collaborators: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                permission: {
                    type: String,
                    enum: ['view', 'comment', 'edit', 'admin'],
                    default: 'view',
                },
                addedAt: { type: Date, default: Date.now },
                addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            },
        ],

        // Sharing
        isPublic: { type: Boolean, default: false },
        shareLink: String,
        sharePermission: {
            type: String,
            enum: ['view', 'comment', 'edit'],
            default: 'view',
        },

        // Version history
        versions: [
            {
                content: mongoose.Schema.Types.Mixed,
                savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                savedAt: { type: Date, default: Date.now },
                description: String,
                versionNumber: Number,
            },
        ],

        currentVersion: { type: Number, default: 1 },

        // Active editors (for real-time tracking)
        activeEditors: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                cursor: {
                    index: Number,
                    length: Number,
                },
                color: String,
                lastActive: Date,
            },
        ],

        // Metadata
        tags: [String],
        category: String,
        wordCount: { type: Number, default: 0 },
        lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isArchived: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        deletedAt: Date,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ tenantId: 1, createdAt: -1 });
documentSchema.index({ 'collaborators.user': 1 });
documentSchema.index({ title: 'text', plainText: 'text' });
documentSchema.index({ isDeleted: 1, deletedAt: 1 });
documentSchema.index({ tags: 1 });

// Auto-save version before content update
documentSchema.methods.saveVersion = async function (userId, description = '') {
    this.versions.push({
        content: this.content,
        savedBy: userId,
        description,
        versionNumber: this.currentVersion,
    });
    this.currentVersion += 1;

    // Keep only last 50 versions
    if (this.versions.length > 50) {
        this.versions = this.versions.slice(-50);
    }

    await this.save();
};

module.exports = mongoose.model('Document', documentSchema);
