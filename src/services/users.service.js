const prisma = require('../models/prisma.client');

class UsersService {
  async findAll({ page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, name: true, email: true, role: true, isActive: true, twoFAEnabled: true, createdAt: true, lastLogin: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);
    return { users, total, page, pages: Math.ceil(total / limit) };
  }

  async findById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true, twoFAEnabled: true, createdAt: true, lastLogin: true },
    });
    if (!user) throw { status: 404, message: 'Usuario no encontrado.' };
    return user;
  }

  async update(id, data, requesterId, requesterRole) {
    if (requesterRole !== 'ADMIN' && requesterId !== id) {
      throw { status: 403, message: 'No tiene permisos para editar este usuario.' };
    }
    if (data.role && requesterRole !== 'ADMIN') delete data.role;

    const user = await prisma.user.update({
      where: { id },
      data: { name: data.name, role: data.role, isActive: data.isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true, twoFAEnabled: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        details: `Usuario actualizado: ${JSON.stringify({ name: data.name, role: data.role })}`,
        userId: requesterId,
      },
    });

    return user;
  }

  async toggleStatus(id, requesterId) {
    if (id === requesterId) throw { status: 400, message: 'No puede desactivar su propia cuenta.' };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw { status: 404, message: 'Usuario no encontrado.' };

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        details: `Estado de usuario cambiado a: ${updated.isActive ? 'activo' : 'inactivo'}`,
        userId: requesterId,
      },
    });

    return updated;
  }

  async getStats() {
    const [total, admins, editors, viewers, active, with2fa] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'EDITOR' } }),
      prisma.user.count({ where: { role: 'VIEWER' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { twoFAEnabled: true } }),
    ]);
    return { total, admins, editors, viewers, active, inactive: total - active, with2fa };
  }
}

module.exports = new UsersService();
