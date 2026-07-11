const authService = require('../services/auth.service');
const prisma = require('../models/prisma.client');

/**
 * Extraer el token Bearer del header Authorization
 */
function getToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) return token;
  return null;
}

/**
 * Verificar JWT de sesión válido
 */
function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'No autenticado. Token requerido.' });

  const payload = authService.verifySessionToken(token);
  if (!payload) return res.status(401).json({ error: 'Token inválido o expirado.' });

  req.user = { id: payload.sub, name: payload.name, email: payload.email, role: payload.role };
  next();
}

/**
 * Verificar rol específico
 */
function requireRole(...roles) {
  return (req, res, next) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'No autenticado. Token requerido.' });

    const payload = authService.verifySessionToken(token);
    if (!payload) return res.status(401).json({ error: 'Token inválido o expirado.' });

    req.user = { id: payload.sub, name: payload.name, email: payload.email, role: payload.role };

    if (!roles.includes(req.user.role)) {
      prisma.auditLog.create({
        data: {
          action: 'PERMISSION_DENIED',
          details: `Acceso denegado a ${req.method} ${req.path} para rol ${req.user.role}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user.id,
        },
      }).catch(console.error);

      return res.status(403).json({ error: 'No tiene permisos para esta acción.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
