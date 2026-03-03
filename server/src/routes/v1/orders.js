import express from 'express';
const router = express.Router();
import order from '../../controllers/orderController.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { orderRules, paginationRules, idParamRule, validate } from '../../middleware/validate.js';

router.use(authenticate);
router.post('/', orderRules, validate, order.createOrder);
router.get('/', paginationRules, validate, order.getOrders);
router.get('/:id', idParamRule, validate, order.getOrder);
router.put('/:id/status', authorize('admin', 'superadmin'), idParamRule, validate, order.updateOrderStatus);
router.put('/:id/cancel', idParamRule, validate, order.cancelOrder);

export default router;
