const router = require('express').Router();
const auditController = require('../controllers/audit.controller');
const { requireRole } = require('../controllers/auth.middleware');

router.get('/stats', requireRole('ADMIN'), (req, res) => auditController.getStats(req, res));
router.get('/', requireRole('ADMIN'), (req, res) => auditController.getAll(req, res));

module.exports = router;
