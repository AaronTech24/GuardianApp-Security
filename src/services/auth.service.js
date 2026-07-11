const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const prisma = require('../models/prisma.client');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const JWT_TEMP_EXPIRES_IN = process.env.JWT_TEMP_EXPIRES_IN || '5m';
const APP_NAME = process.env.TOTP_APP_NAME || 'GuardianApp';

class AuthService {
  /**
   * Registrar nuevo usuario
   */
  async register({ name, email, password, role = 'VIEWER' }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw { status: 409, message: 'El correo ya está registrado.' };
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return user;
  }

  /**
   * Paso 1 de login: validar email/contraseña.
   * Si el usuario tiene 2FA activo, devuelve un token temporal en lugar del token de sesión.
   */
  async login({ email, password, ipAddress, userAgent }) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw { status: 401, message: 'Credenciales inválidas.' };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          details: `Intento fallido para: ${email}`,
          ipAddress,
          userAgent,
          userId: user.id,
        },
      });
      throw { status: 401, message: 'Credenciales inválidas.' };
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      twoFAEnabled: user.twoFAEnabled,
    };

    // Si tiene 2FA activado, emitir un token TEMPORAL que solo permite verificar el código TOTP
    if (user.twoFAEnabled) {
      const tempToken = jwt.sign(
        { sub: user.id, purpose: '2fa_pending' },
        JWT_SECRET,
        { expiresIn: JWT_TEMP_EXPIRES_IN }
      );

      await prisma.auditLog.create({
        data: {
          action: 'LOGIN',
          details: 'Paso 1 exitoso, esperando verificación 2FA',
          ipAddress,
          userAgent,
          userId: user.id,
        },
      });

      return { requires2FA: true, tempToken, user: publicUser };
    }

    // Sin 2FA: emitir token de sesión completo directamente
    const token = this.#issueSessionToken(user);

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        details: 'Inicio de sesión exitoso (sin 2FA)',
        ipAddress,
        userAgent,
        userId: user.id,
      },
    });

    return { requires2FA: false, token, user: publicUser };
  }

  /**
   * Paso 2 de login: verificar código TOTP usando el token temporal
   */
  async verifyTwoFactor({ tempToken, code, ipAddress, userAgent }) {
    let payload;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      throw { status: 401, message: 'Token temporal inválido o expirado. Inicie sesión nuevamente.' };
    }

    if (payload.purpose !== '2fa_pending') {
      throw { status: 401, message: 'Token inválido para esta operación.' };
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.twoFAEnabled) {
      throw { status: 401, message: 'No se pudo verificar el código.' };
    }

    let isValid = authenticator.verify({ token: code, secret: user.twoFASecret });

    // Si el TOTP falla, intentar como código de respaldo (backup code)
    let usedBackup = false;
    if (!isValid && user.backupCodes) {
      const backupCodes = JSON.parse(user.backupCodes);
      for (let i = 0; i < backupCodes.length; i++) {
        if (await bcrypt.compare(code, backupCodes[i])) {
          isValid = true;
          usedBackup = true;
          backupCodes.splice(i, 1); // consumir el código de un solo uso
          await prisma.user.update({
            where: { id: user.id },
            data: { backupCodes: JSON.stringify(backupCodes) },
          });
          break;
        }
      }
    }

    if (!isValid) {
      await prisma.auditLog.create({
        data: {
          action: 'TWOFA_FAILED',
          details: 'Código 2FA incorrecto',
          ipAddress,
          userAgent,
          userId: user.id,
        },
      });
      throw { status: 401, message: 'Código de verificación incorrecto.' };
    }

    const token = this.#issueSessionToken(user);
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    await prisma.auditLog.create({
      data: {
        action: 'TWOFA_VERIFIED',
        details: usedBackup ? 'Login completado con código de respaldo' : 'Login completado con código TOTP',
        ipAddress,
        userAgent,
        userId: user.id,
      },
    });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, twoFAEnabled: true },
      usedBackup,
    };
  }

  /**
   * Generar secreto TOTP + QR para activar 2FA
   */
  async setupTwoFactor(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw { status: 404, message: 'Usuario no encontrado.' };
    if (user.twoFAEnabled) throw { status: 409, message: 'El 2FA ya está activado.' };

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, APP_NAME, secret);
    const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Guardar el secreto temporalmente (se confirma en confirmTwoFactor)
    await prisma.user.update({ where: { id: userId }, data: { twoFASecret: secret } });

    return { secret, qrDataUrl, otpauthUrl };
  }

  /**
   * Confirmar activación de 2FA verificando el primer código
   */
  async confirmTwoFactor(userId, code) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFASecret) throw { status: 400, message: 'Primero debe iniciar la configuración de 2FA.' };

    const isValid = authenticator.verify({ token: code, secret: user.twoFASecret });
    if (!isValid) throw { status: 401, message: 'Código incorrecto. Verifique su aplicación de autenticación.' };

    // Generar códigos de respaldo de un solo uso
    const backupCodesPlain = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase()
    );
    const backupCodesHashed = await Promise.all(
      backupCodesPlain.map(c => bcrypt.hash(c, BCRYPT_ROUNDS))
    );

    await prisma.user.update({
      where: { id: userId },
      data: { twoFAEnabled: true, backupCodes: JSON.stringify(backupCodesHashed) },
    });

    await prisma.auditLog.create({
      data: { action: 'TWOFA_ENABLED', details: '2FA activado por el usuario', userId },
    });

    return { backupCodes: backupCodesPlain };
  }

  /**
   * Desactivar 2FA (requiere contraseña actual)
   */
  async disableTwoFactor(userId, password) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw { status: 404, message: 'Usuario no encontrado.' };

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw { status: 401, message: 'Contraseña incorrecta.' };

    await prisma.user.update({
      where: { id: userId },
      data: { twoFAEnabled: false, twoFASecret: null, backupCodes: null },
    });

    await prisma.auditLog.create({
      data: { action: 'TWOFA_DISABLED', details: '2FA desactivado por el usuario', userId },
    });
  }

  /**
   * Cerrar sesión (con JWT no hay estado en servidor; solo se registra el evento)
   */
  async logout(userId, ipAddress, userAgent) {
    await prisma.auditLog.create({
      data: { action: 'LOGOUT', details: 'Cierre de sesión', ipAddress, userAgent, userId },
    });
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw { status: 404, message: 'Usuario no encontrado.' };

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw { status: 401, message: 'Contraseña actual incorrecta.' };

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    await prisma.auditLog.create({
      data: { action: 'PASSWORD_CHANGE', details: 'Contraseña actualizada', userId },
    });
  }

  /**
   * Verificar y decodificar un token de sesión JWT
   */
  verifySessionToken(token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.purpose !== 'session') return null;
      return payload;
    } catch {
      return null;
    }
  }

  // ─── Privado: emitir token de sesión completo ──────────────────────
  #issueSessionToken(user) {
    return jwt.sign(
      { sub: user.id, name: user.name, email: user.email, role: user.role, purpose: 'session' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
}

module.exports = new AuthService();
