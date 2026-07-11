const auditService = require('../services/audit.service');

class AuditController {
  async getAll(req, res) {
    try {
      const { page, limit, action, userId } = req.query;
      res.json(await auditService.findAll({ page: +page || 1, limit: +limit || 20, action, userId }));
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
  async getStats(req, res) {
    try { res.json(await auditService.getStats()); }
    catch (err) { res.status(500).json({ error: err.message }); }
  }
}

module.exports = new AuditController();
