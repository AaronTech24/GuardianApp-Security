# 🔐 GuardianApp — Seguridad de la Información con JWT + 2FA

Aplicación web de seguridad. Usa **JWT** en lugar de sesiones y agrega
**autenticación en dos factores (2FA TOTP)** con códigos de respaldo.

---

## 🔑 Resumen del Proyecto

| Característica         | GuardianApp (proyecto 2) |
|------------------------|--------------------------|
| Autenticación          | JWT (Bearer Token)       |
| Almacenamiento sesión  | Cliente (sessionStorage) |
| 2FA                    | ✅ TOTP (Google Auth)    |
| Códigos de respaldo    | ✅ 8 códigos de un uso   |
| Puerto                 | 4000                     |
| BD                     | guardian_db              |
| Tema UI                | Claro (light)            |

---

## 🏗️ Estructura del proyecto

```
guardianapp/
├── server.js
├── package.json
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── seed.js
└── src/
    ├── controllers/
    │   ├── auth.middleware.js    ← Verifica JWT Bearer token
    │   ├── auth.controller.js   ← Login, 2FA, registro
    │   ├── users.controller.js
    │   ├── records.controller.js
    │   ├── audit.controller.js
    │   ├── assets.controller.js
    │   └── risks.controller.js
    ├── models/
    │   └── prisma.client.js
    ├── routers/
    │   ├── auth.router.js       ← Incluye /2fa/setup, /2fa/confirm, /2fa/disable
    │   ├── users.router.js
    │   ├── records.router.js
    │   ├── audit.router.js
    │   ├── assets.router.js
    │   └── risks.router.js
    ├── services/
    │   ├── auth.service.js      ← JWT + TOTP 2FA + códigos de respaldo
    │   ├── users.service.js
    │   ├── records.service.js
    │   ├── audit.service.js
    │   ├── assets.service.js
    │   └── risks.service.js
    └── public/
        ├── index.html
        ├── css/app.css          ← Tema claro (light)
        └── js/
            ├── app.js           ← JWT storage, flujo 2FA
            ├── utils.js
            └── pages/
                ├── dashboard.js
                ├── records.js
                ├── users.js
                ├── audit.js
                ├── assets-risks.js
                └── security.js  ← Configurar/desactivar 2FA, cambiar contraseña
```

---

## 🚀 Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar .env
```bash
cp .env.example .env
```
Editar `DATABASE_URL` con tus credenciales PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:12345@localhost:5432/guardian_db"
JWT_SECRET="cambia-este-secreto-por-uno-muy-seguro"
```

### 3. Crear la base de datos
```sql
CREATE DATABASE guardian_db;
```

### 4. Ejecutar migraciones
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Cargar datos de prueba
```bash
npm run seed
```

### 6. Iniciar el servidor
```bash
npm start
```

Abrir: **http://localhost:4000**

---

## 🔑 Credenciales de demo

| Rol    | Email                    | Contraseña   | 2FA     |
|--------|--------------------------|--------------|---------|
| ADMIN  | admin@guardianapp.com    | Admin123!    | Inactivo|
| EDITOR | editor@guardianapp.com   | Editor123!   | Inactivo|
| VIEWER | viewer@guardianapp.com   | Viewer123!   | Inactivo|

> El 2FA se activa manualmente desde **Mi seguridad** tras iniciar sesión.

---

## 🔐 Cómo funciona el 2FA

### Activar
1. Inicie sesión normalmente
2. Vaya a **🛡️ Mi seguridad**
3. Haga clic en **"Activar verificación en dos pasos"**
4. Escanee el código QR con **Google Authenticator**, **Authy** o **Microsoft Authenticator**
5. Ingrese el código de 6 dígitos para confirmar
6. **Guarde los 8 códigos de respaldo** en un lugar seguro

### Login con 2FA activo
1. Ingrese email y contraseña → el servidor devuelve un **token temporal (5 min)**
2. Se muestra la pantalla de verificación con 6 campos OTP
3. Ingrese el código de su app de autenticación
4. El servidor valida y devuelve el **JWT de sesión (8h)**

### Códigos de respaldo
- 8 códigos de un solo uso generados al activar el 2FA
- Cada código se consume al usarse (no puede reutilizarse)
- Almacenados hasheados con bcrypt en la base de datos

---

## 🔒 Seguridad implementada

| Mecanismo               | Implementación                                      |
|-------------------------|-----------------------------------------------------|
| Autenticación           | JWT con firma HS256, expira en 8h                  |
| Token 2FA temporal      | JWT con purpose:'2fa_pending', expira en 5 min     |
| Hash de contraseñas     | bcrypt con 12 rondas de salt                       |
| 2FA                     | TOTP RFC 6238 (compatible con Google Authenticator)|
| Códigos de respaldo     | 8 códigos hasheados con bcrypt, un solo uso        |
| Cabeceras HTTP          | Helmet.js (CSP, X-Frame-Options, etc.)             |
| Rate limiting           | 5 intentos de login por 15 min (solo /api)         |
| Validación de entradas  | express-validator en todas las rutas               |
| Auditoría               | 13 tipos de eventos registrados con IP             |
| Control de acceso       | RBAC con 3 roles: ADMIN, EDITOR, VIEWER            |
