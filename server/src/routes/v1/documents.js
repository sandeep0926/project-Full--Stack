const express = require('express');
const router = express.Router();
const doc = require('../../controllers/documentController');
const { authenticate } = require('../../middleware/auth');
const { documentRules, paginationRules, idParamRule, validate } = require('../../middleware/validate');

router.use(authenticate);
router.post('/', documentRules, validate, doc.createDocument);
router.get('/', paginationRules, validate, doc.getDocuments);
router.get('/:id', idParamRule, validate, doc.getDocument);
router.put('/:id', idParamRule, documentRules, validate, doc.updateDocument);
router.delete('/:id', idParamRule, validate, doc.deleteDocument);
router.post('/:id/share', idParamRule, validate, doc.shareDocument);
router.post('/:id/share-link', idParamRule, validate, doc.generateShareLink);
router.get('/:id/versions', idParamRule, validate, doc.getVersions);
router.put('/:id/versions/:versionNumber', doc.restoreVersion);

module.exports = router;
