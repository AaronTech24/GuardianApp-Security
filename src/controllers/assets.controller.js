const assetsService = require('../services/assets.service');

class AssetsController {
  async getAll(req, res) {
    try { res.json(await assetsService.findAll()); }
    catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getById(req, res) {
    try { res.json(await assetsService.findById(req.params.id)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async create(req, res) {
    try { res.status(201).json(await assetsService.create(req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
  }
  async update(req, res) {
    try { res.json(await assetsService.update(req.params.id, req.body)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async delete(req, res) {
    try { await assetsService.delete(req.params.id); res.json({ message: 'Activo eliminado.' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  }
}

module.exports = new AssetsController();
