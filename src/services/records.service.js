const prisma = require('../models/prisma.client');

class RecordsService {
  async findAll({ page = 1, limit = 10, userId, role } = {}) {
    const skip = (page - 1) * limit;
    const where = role === 'VIEWER'
      ? { OR: [{ isPublic: true }, { authorId: userId }] }
      : {};

    const [records, total] = await Promise.all([
      prisma.record.findMany({
        where,
        skip,
        take: limit,
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.record.count({ where }),
    ]);

    return { records, total, page, pages: Math.ceil(total / limit) };
  }

  async findById(id, userId, role) {
    const record = await prisma.record.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true } } },
    });

    if (!record) throw { status: 404, message: 'Registro no encontrado.' };
    if (role === 'VIEWER' && !record.isPublic && record.authorId !== userId) {
      throw { status: 403, message: 'Acceso denegado a este registro.' };
    }

    await prisma.auditLog.create({ data: { action: 'READ', entity: 'Record', entityId: id, userId } });
    return record;
  }

  async create(data, userId) {
    const record = await prisma.record.create({
      data: { ...data, authorId: userId },
      include: { author: { select: { id: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: { action: 'CREATE', entity: 'Record', entityId: record.id, details: `Creado: ${data.title}`, userId },
    });

    return record;
  }

  async update(id, data, userId, role) {
    const record = await prisma.record.findUnique({ where: { id } });
    if (!record) throw { status: 404, message: 'Registro no encontrado.' };

    if (role === 'VIEWER') throw { status: 403, message: 'Sin permisos para editar.' };
    if (role === 'EDITOR' && record.authorId !== userId) {
      throw { status: 403, message: 'Solo puede editar sus propios registros.' };
    }

    const updated = await prisma.record.update({
      where: { id },
      data,
      include: { author: { select: { id: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: { action: 'UPDATE', entity: 'Record', entityId: id, details: `Actualizado: ${data.title}`, userId },
    });

    return updated;
  }

  async delete(id, userId, role) {
    const record = await prisma.record.findUnique({ where: { id } });
    if (!record) throw { status: 404, message: 'Registro no encontrado.' };

    if (role === 'VIEWER') throw { status: 403, message: 'Sin permisos para eliminar.' };
    if (role === 'EDITOR' && record.authorId !== userId) {
      throw { status: 403, message: 'Solo puede eliminar sus propios registros.' };
    }

    await prisma.record.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { action: 'DELETE', entity: 'Record', entityId: id, details: `Eliminado: ${record.title}`, userId },
    });
  }
}

module.exports = new RecordsService();
