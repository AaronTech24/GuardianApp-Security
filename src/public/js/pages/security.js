// ─── Mi Seguridad (2FA) ────────────────────────────────────────────
async function security() {
  const content = document.getElementById('page-content');
  const u = AppState.user;

  content.innerHTML = `
    <div class="row g-3">
      <!-- Estado 2FA -->
      <div class="col-12 col-lg-6">
        <div class="card-light h-100">
          <div class="d-flex align-items-center gap-3 mb-3">
            <div class="security-icon ${u.twoFAEnabled ? 'on' : 'off'}">
              ${u.twoFAEnabled ? '🔒' : '🔓'}
            </div>
            <div>
              <h6 class="mb-0">Verificación en dos pasos (2FA)</h6>
              <span class="twofa-badge ${u.twoFAEnabled ? 'twofa-on' : 'twofa-off'}">
                ${u.twoFAEnabled ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
          <p style="font-size:0.85rem;color:var(--text-muted)">
            La autenticación en dos pasos añade una capa extra de seguridad. 
            Además de su contraseña, deberá ingresar un código generado por una 
            aplicación como <strong>Google Authenticator</strong>, <strong>Authy</strong> o <strong>Microsoft Authenticator</strong>.
          </p>
          ${u.twoFAEnabled ? `
            <div id="disable-2fa-section">
              <hr style="border-color:var(--border)">
              <h6 class="mb-2" style="font-size:0.85rem">Desactivar 2FA</h6>
              <p style="font-size:0.78rem;color:var(--text-muted)">Ingrese su contraseña para confirmar.</p>
              <input type="password" class="form-control form-control-light mb-2" id="disable-2fa-password" placeholder="Contraseña actual">
              <button class="btn w-100" style="background:rgba(220,38,38,.08);color:#b91c1c;border:1px solid rgba(220,38,38,.2);border-radius:var(--radius-sm);font-weight:600;padding:0.55rem"
                      onclick="disable2FA()">Desactivar verificación en dos pasos</button>
            </div>
          ` : `
            <button class="btn btn-primary-light w-100" onclick="startSetup2FA()">
              🔐 Activar verificación en dos pasos
            </button>
          `}
        </div>
      </div>

      <!-- Cambio de contraseña -->
      <div class="col-12 col-lg-6">
        <div class="card-light h-100">
          <div class="d-flex align-items-center gap-3 mb-3">
            <div class="security-icon on" style="background:rgba(99,102,241,0.1)">🔑</div>
            <div><h6 class="mb-0">Cambiar contraseña</h6></div>
          </div>
          <form onsubmit="changePassword(event)">
            <div class="mb-2">
              <label class="form-label">Contraseña actual</label>
              <input type="password" class="form-control form-control-light" id="current-password" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Nueva contraseña</label>
              <input type="password" class="form-control form-control-light" id="new-password" required
                     placeholder="Mín. 8 chars, mayúscula, número, símbolo">
            </div>
            <button type="submit" class="btn btn-primary-light w-100">Actualizar contraseña</button>
          </form>
        </div>
      </div>

      <!-- Sección de configuración 2FA (oculta inicialmente) -->
      <div class="col-12" id="setup-2fa-section" style="display:none">
        <div class="card-light">
          <h6 class="mb-3">Configurar verificación en dos pasos</h6>
          <div class="row g-4 align-items-center">
            <div class="col-12 col-md-4 text-center">
              <img id="qr-code-img" src="" alt="Código QR" style="max-width:200px;border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.5rem">
              <p style="font-size:0.7rem;color:var(--text-muted);margin-top:0.5rem;word-break:break-all" id="manual-secret"></p>
            </div>
            <div class="col-12 col-md-8">
              <ol style="font-size:0.85rem;color:var(--text-muted)">
                <li class="mb-2">Instale una app de autenticación: <strong>Google Authenticator</strong>, <strong>Authy</strong> o <strong>Microsoft Authenticator</strong>.</li>
                <li class="mb-2">Escanee el código QR con la app, o ingrese el código manual mostrado.</li>
                <li class="mb-2">Ingrese el código de 6 dígitos generado por la app para confirmar:</li>
              </ol>
              <div class="otp-input-group mb-3" id="confirm-otp-group">
                ${Array.from({length: 6}, (_, i) => `
                  <input type="text" maxlength="1" inputmode="numeric" class="confirm-otp-digit" 
                         data-index="${i}" oninput="handleOtpInput2(this, 'confirm-otp-digit')" onkeydown="handleOtpKeydown(event, this)">
                `).join('')}
              </div>
              <button class="btn btn-primary-light" onclick="confirmSetup2FA()">Confirmar y activar</button>
              <button class="btn btn-outline-light-custom ms-2" onclick="cancelSetup2FA()">Cancelar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Códigos de respaldo (mostrados tras activar) -->
      <div class="col-12" id="backup-codes-section" style="display:none">
        <div class="card-light">
          <h6 class="mb-2">✅ 2FA activado exitosamente</h6>
          <p style="font-size:0.85rem;color:var(--text-muted)">
            Guarde estos códigos de respaldo en un lugar seguro. Cada uno puede usarse 
            <strong>una sola vez</strong> si pierde acceso a su aplicación de autenticación.
          </p>
          <div class="row g-2" id="backup-codes-grid"></div>
          <button class="btn btn-outline-light-custom mt-3" onclick="navigateTo('security')">Entendido, continuar</button>
        </div>
      </div>
    </div>
  `;
}

function handleOtpInput2(el, className) {
  if (el.value && !/^\d$/.test(el.value)) { el.value = ''; return; }
  if (el.value) {
    const idx = +el.dataset.index + 1;
    const next = document.querySelector(`.${className}[data-index="${idx}"]`);
    if (next) next.focus();
  }
}

async function startSetup2FA() {
  try {
    const data = await api.post('/api/auth/2fa/setup', {});
    document.getElementById('qr-code-img').src = data.qrDataUrl;
    document.getElementById('manual-secret').textContent = 'Código manual: ' + data.secret;
    document.getElementById('setup-2fa-section').style.display = 'block';
    document.getElementById('setup-2fa-section').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function cancelSetup2FA() {
  document.getElementById('setup-2fa-section').style.display = 'none';
}

async function confirmSetup2FA() {
  const code = Array.from(document.querySelectorAll('.confirm-otp-digit')).map(i => i.value).join('');
  if (code.length !== 6) {
    showToast('Ingrese el código completo de 6 dígitos.', 'danger');
    return;
  }
  try {
    const data = await api.post('/api/auth/2fa/confirm', { code });
    showToast(data.message);

    // Mostrar códigos de respaldo
    document.getElementById('setup-2fa-section').style.display = 'none';
    const grid = document.getElementById('backup-codes-grid');
    grid.innerHTML = data.backupCodes.map(c => `
      <div class="col-6 col-md-3"><div class="backup-code">${c}</div></div>
    `).join('');
    document.getElementById('backup-codes-section').style.display = 'block';

    // Actualizar estado local del usuario
    AppState.user.twoFAEnabled = true;
    renderSidebar();
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('onclick')?.includes("'security'")) el.classList.add('active');
    });
  } catch (err) {
    showToast(err.message, 'danger');
    document.querySelectorAll('.confirm-otp-digit').forEach(i => i.value = '');
  }
}

async function disable2FA() {
  const password = document.getElementById('disable-2fa-password').value;
  if (!password) { showToast('Ingrese su contraseña.', 'danger'); return; }
  if (!confirm('¿Está seguro de desactivar la verificación en dos pasos? Esto reduce la seguridad de su cuenta.')) return;

  try {
    await api.post('/api/auth/2fa/disable', { password });
    showToast('2FA desactivado.', 'warning');
    AppState.user.twoFAEnabled = false;
    renderSidebar();
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('onclick')?.includes("'security'")) el.classList.add('active');
    });
    security();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function changePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  try {
    await api.put('/api/auth/change-password', { currentPassword, newPassword });
    showToast('Contraseña actualizada exitosamente.');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
  } catch (err) {
    showToast(err.message, 'danger');
  }
}
