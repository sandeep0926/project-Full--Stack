// API v2 - Re-exports v1 routes with v2 health check
const express = require('express');
const router = express.Router();

// v2 re-uses v1 routes for backward compatibility
router.use('/auth', require('../v1/auth'));
router.use('/tenants', require('../v1/tenants'));
router.use('/documents', require('../v1/documents'));
router.use('/products', require('../v1/products'));
router.use('/orders', require('../v1/orders'));
router.use('/analytics', require('../v1/analytics'));

// v2 health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            version: 'v2',
            status: 'operational',
            timestamp: new Date().toISOString(),
        },
    });
});

module.exports = router;
