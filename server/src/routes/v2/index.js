import { Router } from 'express';
import authRoutes from '../v1/auth.js';
import tenantRoutes from '../v1/tenants.js';
import documentRoutes from '../v1/documents.js';
import productRoutes from '../v1/products.js';
import orderRoutes from '../v1/orders.js';
import analyticsRoutes from '../v1/analytics.js';

const router = Router();

// V2 reuses v1 routes with additional enhancements
router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/documents', documentRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/analytics', analyticsRoutes);

// V2 specific endpoints
router.get('/health', (req, res) => {
    res.json({ success: true, data: { version: 'v2', status: 'operational' } });
});

export default router;
