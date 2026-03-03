import express from 'express';

import analytics from '../../controllers/analyticsController.js';
import { authenticate, authorize, requireFeature } from '../../middleware/auth.js';

const router = express.Router();
router.post('/events', analytics.trackEvent);
router.get('/dashboard', authenticate, requireFeature('analytics_basic'), analytics.getDashboard);
router.get('/realtime', authenticate, requireFeature('analytics_basic'), analytics.getRealtimeStats);
router.get(
    '/export',
    authenticate,
    authorize('admin', 'superadmin'),
    requireFeature('analytics_advanced'),
    analytics.exportData
);
router.get('/funnel', authenticate, requireFeature('analytics_advanced'), analytics.getConversionFunnel);

export default router;
