const router = require('express').Router();
const recordsController = require('../controllers/records.controller');
const { requireAuth, requireRole } = require('../controllers/auth.middleware');

router.get('/', requireAuth, (req, res) => recordsController.getAll(req, res));
router.get('/:id', requireAuth, (req, res) => recordsController.getById(req, res));
router.post('/', requireRole('ADMIN', 'EDITOR'), (req, res) => recordsController.create(req, res));
router.put('/:id', requireRole('ADMIN', 'EDITOR'), (req, res) => recordsController.update(req, res));
router.delete('/:id', requireRole('ADMIN', 'EDITOR'), (req, res) => recordsController.delete(req, res));

module.exports = router;
