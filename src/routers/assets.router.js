const router = require('express').Router();
const assetsController = require('../controllers/assets.controller');
const { requireAuth, requireRole } = require('../controllers/auth.middleware');

router.get('/', requireAuth, (req, res) => assetsController.getAll(req, res));
router.get('/:id', requireAuth, (req, res) => assetsController.getById(req, res));
router.post('/', requireRole('ADMIN', 'EDITOR'), (req, res) => assetsController.create(req, res));
router.put('/:id', requireRole('ADMIN', 'EDITOR'), (req, res) => assetsController.update(req, res));
router.delete('/:id', requireRole('ADMIN'), (req, res) => assetsController.delete(req, res));

module.exports = router;
