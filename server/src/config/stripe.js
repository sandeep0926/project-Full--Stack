import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16',
});

const SUBSCRIPTION_PLANS = {
    free: {
        name: 'Free',
        price: 0,
        features: ['basic_access', 'single_user', '1_project'],
        limits: {
            maxUsers: 1,
            maxProjects: 1,
            maxStorage: 100, // MB
            maxApiCalls: 1000,
        },
    },
    starter: {
        name: 'Starter',
        stripePriceId: 'price_starter_monthly',
        price: 29,
        features: ['basic_access', 'team_collaboration', '5_projects', 'email_support', 'analytics_basic'],
        limits: {
            maxUsers: 5,
            maxProjects: 5,
            maxStorage: 1024, // MB
            maxApiCalls: 10000,
        },
    },
    professional: {
        name: 'Professional',
        stripePriceId: 'price_professional_monthly',
        price: 79,
        features: [
            'basic_access', 'team_collaboration', 'unlimited_projects',
            'priority_support', 'analytics_advanced', 'api_access',
            'custom_branding', 'audit_logs',
        ],
        limits: {
            maxUsers: 25,
            maxProjects: -1, // unlimited
            maxStorage: 10240, // MB
            maxApiCalls: 100000,
        },
    },
    enterprise: {
        name: 'Enterprise',
        stripePriceId: 'price_enterprise_monthly',
        price: 199,
        features: [
            'basic_access', 'team_collaboration', 'unlimited_projects',
            'dedicated_support', 'analytics_advanced', 'api_access',
            'custom_branding', 'audit_logs', 'sso', 'custom_integrations',
            'sla', 'dedicated_infrastructure',
        ],
        limits: {
            maxUsers: -1, // unlimited
            maxProjects: -1,
            maxStorage: -1,
            maxApiCalls: -1,
        },
    },
};

export { stripe, SUBSCRIPTION_PLANS };
