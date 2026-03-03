const express = require('express');
const router = express.Router();
const tenant = require('../../controllers/tenantController');
const { authenticate, authorize, tenantIsolation } = require('../../middleware/auth');

router.use(authenticate);
router.post('/', tenant.createTenant);
router.get('/current', tenantIsolation, tenant.getCurrentTenant);
router.put('/current', tenantIsolation, tenant.updateTenant);
router.post('/members', tenantIsolation, authorize('admin', 'superadmin'), tenant.inviteMember);
router.delete('/members/:userId', tenantIsolation, authorize('admin', 'superadmin'), tenant.removeMember);
router.put('/members/:userId/role', tenantIsolation, authorize('admin', 'superadmin'), tenant.updateMemberRole);
router.get('/', authorize('superadmin'), tenant.getAllTenants);

module.exports = router;
