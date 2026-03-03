import express from 'express';
const router = express.Router();
import tenant from '../../controllers/tenantController.js';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth.js';

router.use(authenticate);
router.post('/', tenant.createTenant);
router.get('/current', tenantIsolation, tenant.getCurrentTenant);
router.put('/current', tenantIsolation, tenant.updateTenant);
router.post('/members', tenantIsolation, authorize('admin', 'superadmin'), tenant.inviteMember);
router.delete('/members/:userId', tenantIsolation, authorize('admin', 'superadmin'), tenant.removeMember);
router.put('/members/:userId/role', tenantIsolation, authorize('admin', 'superadmin'), tenant.updateMemberRole);
router.get('/', authorize('superadmin'), tenant.getAllTenants);

export default router;
