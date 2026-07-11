const router = require('express').Router();
const usersController = require('../controllers/users.controller');
const { requireAuth, requireRole } = require('../controllers/auth.middleware');

router.get('/stats', requireRole('ADMIN'), (req, res) => usersController.getStats(req, res));
router.get('/', requireRole('ADMIN'), (req, res) => usersController.getAll(req, res));
router.get('/:id', requireAuth, (req, res) => usersController.getById(req, res));
router.put('/:id', requireAuth, (req, res) => usersController.update(req, res));
router.patch('/:id/toggle-status', requireRole('ADMIN'), (req, res) => usersController.toggleStatus(req, res));

module.exports = router;
