import express from 'express';
const router = express.Router();
import product from '../../controllers/productController.js';
import { authenticate, authorize, tenantIsolation, optionalAuth } from '../../middleware/auth.js';
import { productRules, paginationRules, idParamRule, validate } from '../../middleware/validate.js';

router.get('/', optionalAuth, paginationRules, validate, product.getProducts);
router.get('/categories', product.getCategories);
router.get('/:id', optionalAuth, idParamRule, validate, product.getProduct);
router.get('/:id/inventory', authenticate, idParamRule, validate, product.checkInventory);
router.post('/', authenticate, authorize('admin', 'superadmin'), productRules, validate, product.createProduct);
router.put('/:id', authenticate, authorize('admin', 'superadmin'), idParamRule, validate, product.updateProduct);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), idParamRule, validate, product.deleteProduct);

export default router;
