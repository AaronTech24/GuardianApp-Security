require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Seguridad HTTP Headers (CSP corregido) ──────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      mediaSrc: ["'self'", "data:"],
    },
  },
}));

// ─── Rate Limiting Global (solo rutas /api, excluye estáticos) ───────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500,
  message: { error: 'Demasiadas solicitudes, intente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith('/api'),
});
app.use(limiter);

// ─── Middlewares ─────────────────────────────────────────────────────
app.use(cors({ origin: false }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Archivos Estáticos ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'src/public')));

// ─── Rutas API ───────────────────────────────────────────────────────
app.use('/api/auth',    require('./src/routers/auth.router'));
app.use('/api/users',   require('./src/routers/users.router'));
app.use('/api/records', require('./src/routers/records.router'));
app.use('/api/audit',   require('./src/routers/audit.router'));
app.use('/api/assets',  require('./src/routers/assets.router'));
app.use('/api/risks',   require('./src/routers/risks.router'));

// ─── Manejo de Páginas SPA ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/index.html'));
});

// ─── Manejo de Errores ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
  });
});

app.listen(PORT, () => {
  console.log(`\n🔐 GuardianApp iniciado en http://localhost:${PORT}`);
  console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 Autenticación: JWT + 2FA (TOTP)`);
  console.log(`📦 Base de datos: PostgreSQL via Prisma ORM\n`);
});
