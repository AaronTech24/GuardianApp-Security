// ─── Token Storage (in-memory, not localStorage for artifacts safety;
//     here it's a real deployed app so sessionStorage is fine) ───────
const TokenStore = {
  get()  { return sessionStorage.getItem('guardian_token'); },
  set(t) { sessionStorage.setItem('guardian_token', t); },
  clear(){ sessionStorage.removeItem('guardian_token'); },
};

// ─── API Helper ────────────────────────────────────────────────────
const api = {
  async request(method, url, body = null, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = TokenStore.get();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401 && auth) {
        TokenStore.clear();
        AppState.user = null;
        showAuth();
      }
      throw new Error(data.error || (data.errors?.[0]?.msg) || 'Error en la solicitud');
    }
    return data;
  },
  get:    (url)        => api.request('GET',    url),
  post:   (url, body, auth = true) => api.request('POST',   url, body, auth),
  put:    (url, body)  => api.request('PUT',    url, body),
  patch:  (url, body)  => api.request('PATCH',  url, body),
  delete: (url)        => api.request('DELETE', url),
};

// ─── Toast Notifications ───────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const id = 'toast-' + Date.now();
  const colors = { success: '#16a34a', danger: '#dc2626', warning: '#d97706', info: '#6366f1' };
  const icons  = { success: '✓', danger: '✕', warning: '⚠', info: 'ℹ' };

  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast-custom d-flex align-items-center p-3 mb-2">
      <span style="color:${colors[type]};font-size:1.1rem;margin-right:0.75rem">${icons[type]}</span>
      <span style="flex:1;font-size:0.875rem">${message}</span>
      <button onclick="document.getElementById('${id}').remove()" 
              style="background:none;border:none;color:#94a3b8;font-size:1rem;cursor:pointer;padding:0 0 0 0.5rem">×</button>
    </div>
  `);
  setTimeout(() => document.getElementById(id)?.remove(), 4500);
}

// ─── App State ─────────────────────────────────────────────────────
const AppState = {
  user: null,
  currentPage: 'dashboard',
  pendingTempToken: null,
};

// ─── Auth ──────────────────────────────────────────────────────────
async function checkSession() {
  const token = TokenStore.get();
  if (!token) { showAuth(); return; }

  try {
    const data = await api.get('/api/auth/me');
    AppState.user = data.user;
    showApp();
  } catch {
    showAuth();
  }
}

function showApp() {
  document.getElementById('auth-screen').classList.add('d-none');
  document.getElementById('app-screen').classList.remove('d-none');
  renderSidebar();
  navigateTo('dashboard');
}

function showAuth() {
  document.getElementById('auth-screen').classList.remove('d-none');
  document.getElementById('app-screen').classList.add('d-none');
  renderAuthForm('login');
}

// ─── Auth Forms ────────────────────────────────────────────────────
function renderAuthForm(mode) {
  const container = document.getElementById('auth-form-container');

  if (mode === 'login') {
    container.innerHTML = `
      <form id="login-form" onsubmit="handleLogin(event)">
        <div class="mb-3">
          <label class="form-label">Correo electrónico</label>
          <input type="email" class="form-control form-control-light" id="login-email" required
                 placeholder="usuario@ejemplo.com">
        </div>
        <div class="mb-4">
          <label class="form-label">Contraseña</label>
          <div class="input-group">
            <input type="password" class="form-control form-control-light" id="login-password" required
                   placeholder="••••••••">
            <button type="button" class="btn btn-outline-light-custom"
                    onclick="togglePass('login-password')">👁</button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary-light w-100">Iniciar sesión</button>
        <div class="text-center mt-3">
          <small class="text-muted-custom">¿No tiene cuenta? 
            <a href="#" onclick="renderAuthForm('register')" style="color:var(--primary)">Registrarse</a>
          </small>
        </div>
      </form>
    `;
  } else if (mode === 'register') {
    container.innerHTML = `
      <form id="register-form" onsubmit="handleRegister(event)">
        <div class="mb-3">
          <label class="form-label">Nombre completo</label>
          <input type="text" class="form-control form-control-light" id="reg-name" required placeholder="Juan Pérez">
        </div>
        <div class="mb-3">
          <label class="form-label">Correo electrónico</label>
          <input type="email" class="form-control form-control-light" id="reg-email" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Contraseña</label>
          <input type="password" class="form-control form-control-light" id="reg-password" required 
                 placeholder="Mín. 8 chars, mayúscula, número, símbolo">
        </div>
        <button type="submit" class="btn btn-primary-light w-100">Crear cuenta</button>
        <div class="text-center mt-3">
          <small class="text-muted-custom">¿Ya tiene cuenta? 
            <a href="#" onclick="renderAuthForm('login')" style="color:var(--primary)">Iniciar sesión</a>
          </small>
        </div>
      </form>
    `;
  } else if (mode === '2fa') {
    container.innerHTML = `
      <div class="text-center">
        <div class="twofa-icon">🔐</div>
        <h5 class="mb-1">Verificación en dos pasos</h5>
        <p class="text-muted-custom mb-4" style="font-size:0.85rem">
          Ingrese el código de 6 dígitos de su aplicación de autenticación,<br>o un código de respaldo.
        </p>
      </div>
      <form id="twofa-form" onsubmit="handleVerify2FA(event)">
        <div class="otp-input-group mb-3">
          ${Array.from({length: 6}, (_, i) => `
            <input type="text" maxlength="1" inputmode="numeric" class="otp-digit" 
                   data-index="${i}" oninput="handleOtpInput(this)" onkeydown="handleOtpKeydown(event, this)">
          `).join('')}
        </div>
        <p class="text-center text-muted-custom mb-3" style="font-size:0.78rem">
          ¿No tiene acceso a su app? 
          <a href="#" onclick="toggleBackupCodeInput(event)" style="color:var(--primary)">Usar código de respaldo</a>
        </p>
        <div id="backup-code-wrapper" class="d-none mb-3">
          <input type="text" class="form-control form-control-light text-center" id="backup-code-input" 
                 placeholder="XXXX-XXXX" style="font-family:monospace;letter-spacing:2px">
        </div>
        <button type="submit" class="btn btn-primary-light w-100">Verificar</button>
        <div class="text-center mt-3">
          <small class="text-muted-custom">
            <a href="#" onclick="renderAuthForm('login')" style="color:var(--primary)">← Volver al inicio de sesión</a>
          </small>
        </div>
      </form>
    `;
    setTimeout(() => document.querySelector('.otp-digit')?.focus(), 50);
  }
}

function togglePass(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function handleOtpInput(el) {
  if (el.value && !/^\d$/.test(el.value)) { el.value = ''; return; }
  if (el.value) {
    const next = document.querySelector(`.otp-digit[data-index="${+el.dataset.index + 1}"]`);
    if (next) next.focus();
  }
}
function handleOtpKeydown(e, el) {
  if (e.key === 'Backspace' && !el.value) {
    const prev = document.querySelector(`.otp-digit[data-index="${+el.dataset.index - 1}"]`);
    if (prev) prev.focus();
  }
}

function toggleBackupCodeInput(e) {
  e.preventDefault();
  const wrapper = document.getElementById('backup-code-wrapper');
  const otpGroup = document.querySelector('.otp-input-group');
  const isHidden = wrapper.classList.contains('d-none');
  wrapper.classList.toggle('d-none');
  otpGroup.style.display = isHidden ? 'none' : 'flex';
  if (isHidden) document.getElementById('backup-code-input').focus();
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Verificando...';
  try {
    const data = await api.post('/api/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value,
    }, false);

    if (data.requires2FA) {
      AppState.pendingTempToken = data.tempToken;
      showToast('Ingrese su código de verificación.', 'info');
      renderAuthForm('2fa');
      return;
    }

    TokenStore.set(data.token);
    AppState.user = data.user;
    showToast('Bienvenido, ' + data.user.name);
    showApp();
  } catch (err) {
    showToast(err.message, 'danger');
    btn.disabled = false; btn.textContent = 'Iniciar sesión';
  }
}

async function handleVerify2FA(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Verificando...';

  const backupWrapper = document.getElementById('backup-code-wrapper');
  let code;
  if (!backupWrapper.classList.contains('d-none')) {
    code = document.getElementById('backup-code-input').value.trim();
  } else {
    code = Array.from(document.querySelectorAll('.otp-digit')).map(i => i.value).join('');
  }

  if (!code || (code.length !== 6 && !code.includes('-'))) {
    showToast('Ingrese un código válido.', 'danger');
    btn.disabled = false; btn.textContent = 'Verificar';
    return;
  }

  try {
    const data = await api.post('/api/auth/verify-2fa', {
      tempToken: AppState.pendingTempToken,
      code,
    }, false);

    TokenStore.set(data.token);
    AppState.user = data.user;
    AppState.pendingTempToken = null;
    showToast(data.usedBackup ? 'Verificado con código de respaldo.' : 'Verificación exitosa. Bienvenido, ' + data.user.name);
    showApp();
  } catch (err) {
    showToast(err.message, 'danger');
    btn.disabled = false; btn.textContent = 'Verificar';
    document.querySelectorAll('.otp-digit').forEach(i => i.value = '');
    document.querySelector('.otp-digit')?.focus();
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    await api.post('/api/auth/register', {
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value,
    }, false);
    showToast('Cuenta creada. Inicie sesión.');
    renderAuthForm('login');
  } catch (err) {
    showToast(err.message, 'danger');
    btn.disabled = false;
  }
}

async function logout() {
  try { await api.post('/api/auth/logout'); } catch {}
  TokenStore.clear();
  AppState.user = null;
  showAuth();
}

// ─── Sidebar ───────────────────────────────────────────────────────
function renderSidebar() {
  const u = AppState.user;
  const roleClass = { ADMIN: 'avatar-admin', EDITOR: 'avatar-editor', VIEWER: 'avatar-viewer' }[u.role];
  const roleName  = { ADMIN: 'Administrador', EDITOR: 'Editor', VIEWER: 'Visualizador' }[u.role];

  const adminLinks = u.role === 'ADMIN' ? `
    <span class="nav-section-label">Administración</span>
    <div class="nav-item" onclick="navigateTo('users')">
      <span class="nav-icon">👥</span> Usuarios
    </div>
    <div class="nav-item" onclick="navigateTo('audit')">
      <span class="nav-icon">📋</span> Auditoría
    </div>
  ` : '';

  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-brand">
      <span class="brand-icon">🔐</span>
      <span>GuardianApp</span>
    </div>
    <nav class="sidebar-nav">
      <span class="nav-section-label">Principal</span>
      <div class="nav-item" onclick="navigateTo('dashboard')"><span class="nav-icon">📊</span> Dashboard</div>
      <div class="nav-item" onclick="navigateTo('records')"><span class="nav-icon">📁</span> Registros</div>
      <span class="nav-section-label">Seguridad</span>
      <div class="nav-item" onclick="navigateTo('assets')"><span class="nav-icon">🗄️</span> Activos</div>
      <div class="nav-item" onclick="navigateTo('risks')"><span class="nav-icon">⚠️</span> Riesgos</div>
      <div class="nav-item" onclick="navigateTo('security')"><span class="nav-icon">🛡️</span> Mi seguridad</div>
      ${adminLinks}
    </nav>
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar ${roleClass}">${u.name.charAt(0).toUpperCase()}</div>
        <div class="user-details">
          <strong style="font-size:0.825rem">${u.name}</strong>
          <small>${roleName}</small>
        </div>
      </div>
      <div class="mb-2">
        <span class="twofa-badge ${u.twoFAEnabled ? 'twofa-on' : 'twofa-off'}">
          ${u.twoFAEnabled ? '🔒 2FA activo' : '⚠ 2FA inactivo'}
        </span>
      </div>
      <button class="btn btn-sm btn-outline-light-custom w-100" onclick="logout()">🚪 Cerrar sesión</button>
    </div>
  `;
}

// ─── Navigation ────────────────────────────────────────────────────
function navigateTo(page) {
  AppState.currentPage = page;

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('onclick')?.includes(`'${page}'`)) el.classList.add('active');
  });

  const titles = {
    dashboard: 'Dashboard', records: 'Registros', users: 'Usuarios',
    audit: 'Registro de Auditoría', assets: 'Activos de Información',
    risks: 'Gestión de Riesgos', security: 'Mi seguridad',
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  const pages = { dashboard, records, users, audit, assets, risks, security };
  if (pages[page]) pages[page]();
}
