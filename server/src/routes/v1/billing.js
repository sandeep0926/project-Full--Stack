import express from 'express';
import billing from '../../controllers/billingController.js';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth.js';

const router = express.Router();

router.get('/plans', authenticate, tenantIsolation, authorize('admin', 'superadmin'), billing.getPlans);
router.post(
    '/change-plan',
    authenticate,
    tenantIsolation,
    authorize('admin', 'superadmin'),
    billing.changePlan
);
router.post(
    '/checkout-session',
    authenticate,
    tenantIsolation,
    authorize('admin', 'superadmin'),
    billing.createCheckoutSession
);

export default router;

