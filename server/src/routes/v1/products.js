const express = require('express');
const router = express.Router();
const product = require('../../controllers/productController');
const { authenticate, authorize, tenantIsolation, optionalAuth } = require('../../middleware/auth');
const { productRules, paginationRules, idParamRule, validate } = require('../../middleware/validate');

router.get('/', optionalAuth, paginationRules, validate, product.getProducts);
router.get('/categories', product.getCategories);
router.get('/:id', optionalAuth, idParamRule, validate, product.getProduct);
router.get('/:id/inventory', authenticate, idParamRule, validate, product.checkInventory);
router.post('/', authenticate, authorize('admin', 'superadmin'), productRules, validate, product.createProduct);
router.put('/:id', authenticate, authorize('admin', 'superadmin'), idParamRule, validate, product.updateProduct);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), idParamRule, validate, product.deleteProduct);

module.exports = router;
