const risksService = require('../services/risks.service');

class RisksController {
  async getAll(req, res) {
    try { res.json(await risksService.findAll()); }
    catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getMatrix(req, res) {
    try { res.json(await risksService.getMatrix()); }
    catch (err) { res.status(500).json({ error: err.message }); }
  }
  async create(req, res) {
    try { res.status(201).json(await risksService.create(req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
  }
  async update(req, res) {
    try { res.json(await risksService.update(req.params.id, req.body)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async delete(req, res) {
    try { await risksService.delete(req.params.id); res.json({ message: 'Riesgo eliminado.' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  }
}

module.exports = new RisksController();
