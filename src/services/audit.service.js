const prisma = require('../models/prisma.client');

class AuditService {
  async findAll({ page = 1, limit = 20, action, userId } = {}) {
    const skip = (page - 1) * limit;
    const where = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, pages: Math.ceil(total / limit) };
  }

  async getStats() {
    const recent = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, role: true } } },
    });

    const totalLogs = await prisma.auditLog.count();
    const todayLogs = await prisma.auditLog.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });

    return { recent, totalLogs, todayLogs };
  }
}

module.exports = new AuditService();
