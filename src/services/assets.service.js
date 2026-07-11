const prisma = require('../models/prisma.client');

class AssetsService {
  async findAll() {
    return prisma.asset.findMany({ include: { risks: true }, orderBy: { createdAt: 'desc' } });
  }

  async findById(id) {
    const asset = await prisma.asset.findUnique({ where: { id }, include: { risks: true } });
    if (!asset) throw { status: 404, message: 'Activo no encontrado.' };
    return asset;
  }

  async create(data) {
    return prisma.asset.create({ data, include: { risks: true } });
  }

  async update(id, data) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw { status: 404, message: 'Activo no encontrado.' };
    return prisma.asset.update({ where: { id }, data, include: { risks: true } });
  }

  async delete(id) {
    await prisma.risk.deleteMany({ where: { assetId: id } });
    await prisma.asset.delete({ where: { id } });
  }
}

module.exports = new AssetsService();
