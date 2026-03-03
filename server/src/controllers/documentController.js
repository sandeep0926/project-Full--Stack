const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { NotFoundError, AuthorizationError } = require('../utils/errors');
const { generateSecureToken } = require('../utils/tokens');

// @desc Create document
// @route POST /api/v1/documents
exports.createDocument = async (req, res, next) => {
    try {
        const doc = await Document.create({
            title: req.body.title || 'Untitled Document',
            content: req.body.content || { ops: [{ insert: '\n' }] },
            owner: req.user._id,
            tenantId: req.user.tenantId,
        });

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: req.user.tenantId,
            action: 'DOCUMENT_CREATE',
            category: 'document',
            description: `Document "${doc.title}" created`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            resourceType: 'document',
            resourceId: doc._id,
        });

        res.status(201).json({
            success: true,
            data: { document: doc },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get all documents (user's owned + shared)
// @route GET /api/v1/documents
exports.getDocuments = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, sort = '-updatedAt' } = req.query;

        const query = {
            isDeleted: false,
            $or: [
                { owner: req.user._id },
                { 'collaborators.user': req.user._id },
                ...(req.user.tenantId ? [{ tenantId: req.user.tenantId, isPublic: true }] : []),
            ],
        };

        if (search) {
            query.$text = { $search: search };
        }

        const documents = await Document.find(query)
            .populate('owner', 'name email avatar')
            .populate('lastEditedBy', 'name email avatar')
            .select('-versions -content')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Document.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                documents,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get single document
// @route GET /api/v1/documents/:id
exports.getDocument = async (req, res, next) => {
    try {
        const cacheKey = `doc:${req.params.id}`;
        let doc = await cacheGet(cacheKey);

        if (!doc) {
            doc = await Document.findById(req.params.id)
                .populate('owner', 'name email avatar')
                .populate('collaborators.user', 'name email avatar')
                .populate('lastEditedBy', 'name email avatar');

            if (!doc || doc.isDeleted) {
                throw new NotFoundError('Document');
            }

            await cacheSet(cacheKey, doc, 60);
        }

        // Check access
        const isOwner = doc.owner._id?.toString() === req.user._id.toString() ||
            doc.owner.toString() === req.user._id.toString();
        const isCollaborator = doc.collaborators?.some(
            (c) => (c.user._id?.toString() || c.user.toString()) === req.user._id.toString()
        );
        const isTenantMember = doc.tenantId?.toString() === req.user.tenantId?.toString();

        if (!isOwner && !isCollaborator && !doc.isPublic && !isTenantMember && req.user.role !== 'superadmin') {
            throw new AuthorizationError('Not authorized to access this document');
        }

        res.status(200).json({
            success: true,
            data: { document: doc },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Update document
// @route PUT /api/v1/documents/:id
exports.updateDocument = async (req, res, next) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc || doc.isDeleted) {
            throw new NotFoundError('Document');
        }

        // Check write access
        const isOwner = doc.owner.toString() === req.user._id.toString();
        const hasEditAccess = doc.collaborators.some(
            (c) => c.user.toString() === req.user._id.toString() && ['edit', 'admin'].includes(c.permission)
        );

        if (!isOwner && !hasEditAccess && req.user.role !== 'superadmin') {
            throw new AuthorizationError('Not authorized to edit this document');
        }

        // Save version before update
        if (req.body.content && JSON.stringify(doc.content) !== JSON.stringify(req.body.content)) {
            await doc.saveVersion(req.user._id, req.body.versionDescription);
        }

        // Update fields
        if (req.body.title) doc.title = req.body.title;
        if (req.body.content) doc.content = req.body.content;
        if (req.body.plainText) doc.plainText = req.body.plainText;
        if (req.body.tags) doc.tags = req.body.tags;

        doc.lastEditedBy = req.user._id;
        doc.wordCount = req.body.plainText ? req.body.plainText.split(/\s+/).filter(Boolean).length : doc.wordCount;

        await doc.save();

        await cacheDel(`doc:${doc._id}`);

        res.status(200).json({
            success: true,
            data: { document: doc },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Share document
// @route POST /api/v1/documents/:id/share
exports.shareDocument = async (req, res, next) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc || doc.isDeleted) throw new NotFoundError('Document');

        const isOwner = doc.owner.toString() === req.user._id.toString();
        const isAdmin = doc.collaborators.some(
            (c) => c.user.toString() === req.user._id.toString() && c.permission === 'admin'
        );

        if (!isOwner && !isAdmin) {
            throw new AuthorizationError('Only document owner or admin can share');
        }

        const { userId, permission = 'view' } = req.body;

        // Check if already shared
        const existing = doc.collaborators.find((c) => c.user.toString() === userId);
        if (existing) {
            existing.permission = permission;
        } else {
            doc.collaborators.push({
                user: userId,
                permission,
                addedBy: req.user._id,
            });
        }

        await doc.save();
        await cacheDel(`doc:${doc._id}`);

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: req.user.tenantId,
            action: 'DOCUMENT_SHARE',
            category: 'document',
            description: `Shared document with user ${userId} (${permission})`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            resourceType: 'document',
            resourceId: doc._id,
        });

        res.status(200).json({
            success: true,
            data: { message: 'Document shared successfully' },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Generate share link
// @route POST /api/v1/documents/:id/share-link
exports.generateShareLink = async (req, res, next) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc || doc.isDeleted) throw new NotFoundError('Document');

        if (doc.owner.toString() !== req.user._id.toString()) {
            throw new AuthorizationError('Only document owner can generate share links');
        }

        doc.shareLink = generateSecureToken(16);
        doc.sharePermission = req.body.permission || 'view';
        doc.isPublic = true;
        await doc.save();

        await cacheDel(`doc:${doc._id}`);

        res.status(200).json({
            success: true,
            data: {
                shareLink: `${process.env.CLIENT_URL}/documents/shared/${doc.shareLink}`,
                permission: doc.sharePermission,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get document versions
// @route GET /api/v1/documents/:id/versions
exports.getVersions = async (req, res, next) => {
    try {
        const doc = await Document.findById(req.params.id)
            .select('versions currentVersion')
            .populate('versions.savedBy', 'name email avatar');

        if (!doc) throw new NotFoundError('Document');

        res.status(200).json({
            success: true,
            data: {
                versions: doc.versions,
                currentVersion: doc.currentVersion,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Restore document version
// @route PUT /api/v1/documents/:id/versions/:versionNumber
exports.restoreVersion = async (req, res, next) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) throw new NotFoundError('Document');

        const version = doc.versions.find(
            (v) => v.versionNumber === parseInt(req.params.versionNumber)
        );
        if (!version) throw new NotFoundError('Version');

        // Save current state as a version first
        await doc.saveVersion(req.user._id, 'Auto-saved before version restore');

        doc.content = version.content;
        doc.lastEditedBy = req.user._id;
        await doc.save();

        await cacheDel(`doc:${doc._id}`);

        res.status(200).json({
            success: true,
            data: { document: doc },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Delete document (soft delete)
// @route DELETE /api/v1/documents/:id
exports.deleteDocument = async (req, res, next) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) throw new NotFoundError('Document');

        if (doc.owner.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            throw new AuthorizationError('Only document owner can delete');
        }

        doc.isDeleted = true;
        doc.deletedAt = new Date();
        await doc.save();

        await cacheDel(`doc:${doc._id}`);

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: req.user.tenantId,
            action: 'DOCUMENT_DELETE',
            category: 'document',
            description: `Document "${doc.title}" deleted`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            resourceType: 'document',
            resourceId: doc._id,
        });

        res.status(200).json({
            success: true,
            data: { message: 'Document deleted' },
        });
    } catch (error) {
        next(error);
    }
};
