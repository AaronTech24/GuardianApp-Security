const prisma = require('../models/prisma.client');

function calcLevel(prob, impact) {
  const score = prob * impact;
  if (score >= 16) return 'Crítico';
  if (score >= 9)  return 'Alto';
  if (score >= 4)  return 'Medio';
  return 'Bajo';
}

class RisksService {
  async findAll() {
    return prisma.risk.findMany({
      include: { asset: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data) {
    const riskLevel = calcLevel(data.probability, data.impact);
    return prisma.risk.create({ data: { ...data, riskLevel } });
  }

  async update(id, data) {
    const risk = await prisma.risk.findUnique({ where: { id } });
    if (!risk) throw { status: 404, message: 'Riesgo no encontrado.' };
    const riskLevel = calcLevel(data.probability ?? risk.probability, data.impact ?? risk.impact);
    return prisma.risk.update({ where: { id }, data: { ...data, riskLevel } });
  }

  async delete(id) {
    await prisma.risk.delete({ where: { id } });
  }

  async getMatrix() {
    const risks = await prisma.risk.findMany({ include: { asset: { select: { name: true } } } });
    return risks.map(r => ({ ...r, score: r.probability * r.impact }));
  }
}

module.exports = new RisksService();
