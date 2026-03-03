const express = require('express');
const router = express.Router();
const analytics = require('../../controllers/analyticsController');
const { authenticate, authorize } = require('../../middleware/auth');

router.post('/events', analytics.trackEvent);
router.get('/dashboard', authenticate, analytics.getDashboard);
router.get('/realtime', authenticate, analytics.getRealtimeStats);
router.get('/export', authenticate, authorize('admin', 'superadmin'), analytics.exportData);
router.get('/funnel', authenticate, analytics.getConversionFunnel);

module.exports = router;
