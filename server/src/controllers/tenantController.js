const Tenant = require('../models/Tenant');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { SUBSCRIPTION_PLANS } = require('../config/stripe');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { NotFoundError, AuthorizationError, ConflictError } = require('../utils/errors');

// @desc Create tenant
// @route POST /api/v1/tenants
exports.createTenant = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const existingTenant = await Tenant.findOne({ slug });
        if (existingTenant) {
            throw new ConflictError('A tenant with this name already exists');
        }

        const tenant = await Tenant.create({
            name,
            slug,
            description,
            owner: req.user._id,
            members: [{ user: req.user._id, role: 'owner' }],
            settings: {
                features: SUBSCRIPTION_PLANS.free.features,
                maxUsers: SUBSCRIPTION_PLANS.free.limits.maxUsers,
                maxProjects: SUBSCRIPTION_PLANS.free.limits.maxProjects,
            },
        });

        // Update user's tenant
        await User.findByIdAndUpdate(req.user._id, {
            tenantId: tenant._id,
            role: 'admin',
        });

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: tenant._id,
            action: 'TENANT_CREATE',
            category: 'tenant',
            description: `Tenant "${name}" created`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(201).json({
            success: true,
            data: { tenant },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get current tenant
// @route GET /api/v1/tenants/current
exports.getCurrentTenant = async (req, res, next) => {
    try {
        const cacheKey = `tenant:${req.user.tenantId}`;
        let tenant = await cacheGet(cacheKey);

        if (!tenant) {
            tenant = await Tenant.findById(req.user.tenantId)
                .populate('members.user', 'name email avatar role')
                .populate('owner', 'name email avatar');

            if (!tenant) {
                throw new NotFoundError('Tenant');
            }

            await cacheSet(cacheKey, tenant, 300); // Cache for 5 minutes
        }

        res.status(200).json({
            success: true,
            data: { tenant },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Update tenant
// @route PUT /api/v1/tenants/current
exports.updateTenant = async (req, res, next) => {
    try {
        const { name, description, settings } = req.body;

        const tenant = await Tenant.findById(req.user.tenantId);
        if (!tenant) {
            throw new NotFoundError('Tenant');
        }

        // Only owner/admin can update
        const memberRole = tenant.members.find(
            (m) => m.user.toString() === req.user._id.toString()
        )?.role;

        if (!['owner', 'admin'].includes(memberRole) && req.user.role !== 'superadmin') {
            throw new AuthorizationError('Only tenant owner or admin can update settings');
        }

        if (name) tenant.name = name;
        if (description) tenant.description = description;
        if (settings) {
            Object.assign(tenant.settings, settings);
        }

        await tenant.save();

        // Invalidate cache
        await cacheDel(`tenant:${tenant._id}`);

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: tenant._id,
            action: 'TENANT_UPDATE',
            category: 'tenant',
            description: 'Tenant updated',
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(200).json({
            success: true,
            data: { tenant },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Invite member
// @route POST /api/v1/tenants/members
exports.inviteMember = async (req, res, next) => {
    try {
        const { email, role = 'member' } = req.body;

        const tenant = await Tenant.findById(req.user.tenantId);
        if (!tenant) {
            throw new NotFoundError('Tenant');
        }

        // Check member limit
        const plan = SUBSCRIPTION_PLANS[tenant.subscription.plan] || SUBSCRIPTION_PLANS.free;
        if (plan.limits.maxUsers !== -1 && tenant.members.length >= plan.limits.maxUsers) {
            throw new AuthorizationError(`Member limit (${plan.limits.maxUsers}) reached. Please upgrade your plan.`);
        }

        const userToInvite = await User.findOne({ email });
        if (!userToInvite) {
            throw new NotFoundError('User with this email');
        }

        // Check if already a member
        const existingMember = tenant.members.find(
            (m) => m.user.toString() === userToInvite._id.toString()
        );
        if (existingMember) {
            throw new ConflictError('User is already a member of this tenant');
        }

        tenant.members.push({
            user: userToInvite._id,
            role,
            invitedBy: req.user._id,
        });
        await tenant.save();

        // Update user's tenant
        userToInvite.tenantId = tenant._id;
        await userToInvite.save();

        await cacheDel(`tenant:${tenant._id}`);

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: tenant._id,
            action: 'MEMBER_INVITE',
            category: 'tenant',
            description: `Invited ${email} as ${role}`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(200).json({
            success: true,
            data: { message: `Member ${email} invited successfully` },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Remove member
// @route DELETE /api/v1/tenants/members/:userId
exports.removeMember = async (req, res, next) => {
    try {
        const tenant = await Tenant.findById(req.user.tenantId);
        if (!tenant) {
            throw new NotFoundError('Tenant');
        }

        const memberToRemove = tenant.members.find(
            (m) => m.user.toString() === req.params.userId
        );

        if (!memberToRemove) {
            throw new NotFoundError('Member');
        }

        if (memberToRemove.role === 'owner') {
            throw new AuthorizationError('Cannot remove the tenant owner');
        }

        tenant.members = tenant.members.filter(
            (m) => m.user.toString() !== req.params.userId
        );
        await tenant.save();

        // Remove tenant from user
        await User.findByIdAndUpdate(req.params.userId, { $unset: { tenantId: 1 } });

        await cacheDel(`tenant:${tenant._id}`);

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: tenant._id,
            action: 'MEMBER_REMOVE',
            category: 'tenant',
            description: `Removed member ${req.params.userId}`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(200).json({
            success: true,
            data: { message: 'Member removed' },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Update member role
// @route PUT /api/v1/tenants/members/:userId/role
exports.updateMemberRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const tenant = await Tenant.findById(req.user.tenantId);

        if (!tenant) throw new NotFoundError('Tenant');

        const member = tenant.members.find(
            (m) => m.user.toString() === req.params.userId
        );

        if (!member) throw new NotFoundError('Member');
        if (member.role === 'owner') throw new AuthorizationError('Cannot change owner role');

        member.role = role;
        await tenant.save();

        await cacheDel(`tenant:${tenant._id}`);

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: tenant._id,
            action: 'MEMBER_ROLE_CHANGE',
            category: 'tenant',
            description: `Changed role of ${req.params.userId} to ${role}`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(200).json({
            success: true,
            data: { message: 'Role updated' },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get all tenants (superadmin)
// @route GET /api/v1/tenants
exports.getAllTenants = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } },
            ];
        }

        const tenants = await Tenant.find(query)
            .populate('owner', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Tenant.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                tenants,
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
