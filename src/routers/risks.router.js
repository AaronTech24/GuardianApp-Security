const router = require('express').Router();
const risksController = require('../controllers/risks.controller');
const { requireAuth, requireRole } = require('../controllers/auth.middleware');

router.get('/matrix', requireAuth, (req, res) => risksController.getMatrix(req, res));
router.get('/', requireAuth, (req, res) => risksController.getAll(req, res));
router.post('/', requireRole('ADMIN', 'EDITOR'), (req, res) => risksController.create(req, res));
router.put('/:id', requireRole('ADMIN', 'EDITOR'), (req, res) => risksController.update(req, res));
router.delete('/:id', requireRole('ADMIN'), (req, res) => risksController.delete(req, res));

module.exports = router;
