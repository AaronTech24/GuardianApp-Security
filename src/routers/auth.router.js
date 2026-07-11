const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../controllers/auth.middleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  message: { error: 'Demasiados intentos de inicio de sesión. Intente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Nombre requerido').isLength({ min: 2, max: 60 }),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .withMessage('Debe contener mayúscula, número y carácter especial (!@#$%^&*)'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Contraseña requerida'),
];

const twoFAVerifyValidation = [
  body('tempToken').notEmpty().withMessage('Token temporal requerido'),
  body('code').trim().isLength({ min: 6, max: 11 }).withMessage('Código inválido'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .withMessage('Debe contener mayúscula, número y carácter especial (!@#$%^&*)'),
];

// ─── Registro / Login ─────────────────────────────────────────────
router.post('/register', registerValidation, (req, res) => authController.register(req, res));
router.post('/login', loginLimiter, loginValidation, (req, res) => authController.login(req, res));
router.post('/verify-2fa', loginLimiter, twoFAVerifyValidation, (req, res) => authController.verifyTwoFactor(req, res));

// ─── Sesión ──────────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => authController.logout(req, res));
router.get('/me', requireAuth, (req, res) => authController.me(req, res));
router.put('/change-password', requireAuth, changePasswordValidation, (req, res) => authController.changePassword(req, res));

// ─── 2FA Setup ───────────────────────────────────────────────────
router.post('/2fa/setup', requireAuth, (req, res) => authController.setupTwoFactor(req, res));
router.post('/2fa/confirm', requireAuth, [body('code').trim().isLength({ min: 6, max: 6 })], (req, res) => authController.confirmTwoFactor(req, res));
router.post('/2fa/disable', requireAuth, [body('password').notEmpty()], (req, res) => authController.disableTwoFactor(req, res));

module.exports = router;
