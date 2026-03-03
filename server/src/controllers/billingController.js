import Tenant from '../models/Tenant.js';
import { SUBSCRIPTION_PLANS, stripe } from '../config/stripe.js';
import { ValidationError, AuthorizationError } from '../utils/errors.js';

const getPlans = (req, res) => {
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
        id: key,
        name: plan.name,
        price: plan.price,
        features: plan.features,
        limits: plan.limits,
        stripePriceId: plan.stripePriceId,
    }));
    res.status(200).json({ success: true, data: { plans } });
};

const applyPlanToTenant = (tenant, planKey) => {
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan) {
        throw new ValidationError('Invalid subscription plan');
    }

    tenant.subscription.plan = planKey;
    tenant.subscription.status = 'active';

    tenant.settings.features = plan.features;
    tenant.settings.maxUsers = plan.limits.maxUsers;
    tenant.settings.maxProjects = plan.limits.maxProjects;
};

const changePlan = async (req, res, next) => {
    try {
        const { plan } = req.body;
        if (!plan) {
            throw new ValidationError('Plan is required');
        }
        if (!SUBSCRIPTION_PLANS[plan]) {
            throw new ValidationError('Invalid subscription plan');
        }

        const tenant = await Tenant.findById(req.user.tenantId);
        if (!tenant) {
            throw new AuthorizationError('Tenant not found');
        }

        applyPlanToTenant(tenant, plan);
        await tenant.save();

        res.status(200).json({
            success: true,
            data: {
                subscription: tenant.subscription,
                settings: tenant.settings,
            },
        });
    } catch (error) {
        next(error);
    }
};

const createCheckoutSession = async (req, res, next) => {
    try {
        const { plan, successUrl, cancelUrl } = req.body;
        if (!plan) {
            throw new ValidationError('Plan is required');
        }
        const planConfig = SUBSCRIPTION_PLANS[plan];
        if (!planConfig || !planConfig.stripePriceId) {
            throw new ValidationError('Selected plan is not billable');
        }

        const tenant = await Tenant.findById(req.user.tenantId);
        if (!tenant) {
            throw new AuthorizationError('Tenant not found');
        }

        const customer = tenant.subscription.stripeCustomerId
            ? { id: tenant.subscription.stripeCustomerId }
            : await stripe.customers.create({
                  email: req.user.email,
                  metadata: { tenantId: String(tenant._id) },
              });

        if (!tenant.subscription.stripeCustomerId) {
            tenant.subscription.stripeCustomerId = customer.id;
            await tenant.save();
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customer.id,
            line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
            success_url: successUrl || `${process.env.CLIENT_URL}/billing/success`,
            cancel_url: cancelUrl || `${process.env.CLIENT_URL}/billing/cancel`,
            metadata: {
                tenantId: String(tenant._id),
                plan,
            },
        });

        res.status(200).json({
            success: true,
            data: {
                sessionId: session.id,
                url: session.url,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getPlans,
    changePlan,
    createCheckoutSession,
};

