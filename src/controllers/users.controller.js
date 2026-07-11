const usersService = require('../services/users.service');

class UsersController {
  async getAll(req, res) {
    try {
      const { page, limit } = req.query;
      res.json(await usersService.findAll({ page: +page || 1, limit: +limit || 10 }));
    } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async getById(req, res) {
    try { res.json(await usersService.findById(req.params.id)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async update(req, res) {
    try {
      const user = await usersService.update(req.params.id, req.body, req.user.id, req.user.role);
      res.json({ message: 'Usuario actualizado.', user });
    } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async toggleStatus(req, res) {
    try {
      const user = await usersService.toggleStatus(req.params.id, req.user.id);
      res.json({ message: `Usuario ${user.isActive ? 'activado' : 'desactivado'}.`, user });
    } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async getStats(req, res) {
    try { res.json(await usersService.getStats()); }
    catch (err) { res.status(500).json({ error: err.message }); }
  }
}

module.exports = new UsersController();
