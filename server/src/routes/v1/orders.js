const express = require('express');
const router = express.Router();
const order = require('../../controllers/orderController');
const { authenticate, authorize } = require('../../middleware/auth');
const { orderRules, paginationRules, idParamRule, validate } = require('../../middleware/validate');

router.use(authenticate);
router.post('/', orderRules, validate, order.createOrder);
router.get('/', paginationRules, validate, order.getOrders);
router.get('/:id', idParamRule, validate, order.getOrder);
router.put('/:id/status', authorize('admin', 'superadmin'), idParamRule, validate, order.updateOrderStatus);
router.put('/:id/cancel', idParamRule, validate, order.cancelOrder);

module.exports = router;
