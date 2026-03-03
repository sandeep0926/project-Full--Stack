import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            index: true,
        },
        action: {
            type: String,
            required: true,
            enum: [
                'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTER', 'USER_UPDATE',
                'PASSWORD_CHANGE', 'PASSWORD_RESET', 'MFA_ENABLE', 'MFA_DISABLE',
                'ACCOUNT_LOCK', 'ACCOUNT_UNLOCK',
                'TENANT_CREATE', 'TENANT_UPDATE', 'TENANT_DELETE',
                'MEMBER_INVITE', 'MEMBER_REMOVE', 'MEMBER_ROLE_CHANGE',
                'SUBSCRIPTION_CREATE', 'SUBSCRIPTION_UPDATE', 'SUBSCRIPTION_CANCEL',
                'DOCUMENT_CREATE', 'DOCUMENT_UPDATE', 'DOCUMENT_DELETE', 'DOCUMENT_SHARE',
                'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE',
                'ORDER_CREATE', 'ORDER_UPDATE', 'ORDER_CANCEL',
                'PAYMENT_SUCCESS', 'PAYMENT_FAILED',
                'API_ACCESS', 'SETTINGS_CHANGE', 'DATA_EXPORT',
            ],
        },
        category: {
            type: String,
            enum: ['auth', 'tenant', 'billing', 'document', 'ecommerce', 'system', 'data'],
            required: true,
        },
        description: String,
        metadata: mongoose.Schema.Types.Mixed,
        ip: String,
        userAgent: String,
        status: {
            type: String,
            enum: ['success', 'failure', 'warning'],
            default: 'success',
        },
        resourceType: String,
        resourceId: mongoose.Schema.Types.ObjectId,
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });

// TTL index - auto-delete logs older than 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to log an action
auditLogSchema.statics.logAction = async function (data) {
    return this.create(data);
};

export default mongoose.model('AuditLog', auditLogSchema);
