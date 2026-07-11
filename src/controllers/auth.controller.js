const authService = require('../services/auth.service');
const { validationResult } = require('express-validator');

class AuthController {
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const user = await authService.register(req.body);
      res.status(201).json({ message: 'Usuario registrado exitosamente.', user });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const result = await authService.login({
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      if (result.requires2FA) {
        return res.json({
          message: 'Verificación en dos pasos requerida.',
          requires2FA: true,
          tempToken: result.tempToken,
          user: result.user,
        });
      }

      res.json({ message: 'Sesión iniciada.', requires2FA: false, token: result.token, user: result.user });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async verifyTwoFactor(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const result = await authService.verifyTwoFactor({
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ message: 'Verificación exitosa.', token: result.token, user: result.user, usedBackup: result.usedBackup });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async setupTwoFactor(req, res) {
    try {
      const result = await authService.setupTwoFactor(req.user.id);
      res.json({ message: 'Escanee el código QR con su app de autenticación.', ...result });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async confirmTwoFactor(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const result = await authService.confirmTwoFactor(req.user.id, req.body.code);
      res.json({ message: '2FA activado exitosamente. Guarde sus códigos de respaldo.', backupCodes: result.backupCodes });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async disableTwoFactor(req, res) {
    try {
      await authService.disableTwoFactor(req.user.id, req.body.password);
      res.json({ message: '2FA desactivado.' });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async logout(req, res) {
    try {
      await authService.logout(req.user.id, req.ip, req.get('User-Agent'));
      res.json({ message: 'Sesión cerrada.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  me(req, res) {
    res.json({ user: req.user || null });
  }

  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      await authService.changePassword(req.user.id, req.body);
      res.json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
}

module.exports = new AuthController();
