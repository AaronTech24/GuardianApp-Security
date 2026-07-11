const recordsService = require('../services/records.service');

class RecordsController {
  async getAll(req, res) {
    try {
      const { page, limit } = req.query;
      res.json(await recordsService.findAll({ page: +page || 1, limit: +limit || 10, userId: req.user.id, role: req.user.role }));
    } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async getById(req, res) {
    try { res.json(await recordsService.findById(req.params.id, req.user.id, req.user.role)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async create(req, res) {
    try {
      const record = await recordsService.create(req.body, req.user.id);
      res.status(201).json({ message: 'Registro creado.', record });
    } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async update(req, res) {
    try {
      const record = await recordsService.update(req.params.id, req.body, req.user.id, req.user.role);
      res.json({ message: 'Registro actualizado.', record });
    } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async delete(req, res) {
    try {
      await recordsService.delete(req.params.id, req.user.id, req.user.role);
      res.json({ message: 'Registro eliminado.' });
    } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
}

module.exports = new RecordsController();
