// ─── Users (ADMIN only) ────────────────────────────────────────────
let usersData = [];

async function users() {
  if (AppState.user.role !== 'ADMIN') {
    document.getElementById('page-content').innerHTML =
      `<div class="empty-state"><span class="empty-icon">🔒</span>Acceso restringido.</div>`;
    return;
  }

  document.getElementById('page-content').innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <input type="search" class="form-control form-control-light" style="width:240px" 
             placeholder="Buscar usuario..." oninput="filterUsers(this.value)">
      <button class="btn btn-primary-light" onclick="openUserModal()">+ Nuevo usuario</button>
    </div>
    <div class="card-light p-0 overflow-hidden">
      <table class="table table-light-custom table-hover mb-0">
        <thead>
          <tr>
            <th>Usuario</th><th>Email</th><th>Rol</th><th>2FA</th><th>Estado</th><th>Último acceso</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody id="users-body">
          <tr><td colspan="7" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></td></tr>
        </tbody>
      </table>
    </div>
    <div id="users-pagination" class="mt-3"></div>

    <div class="modal modal-light fade" id="userModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="userModalTitle">Nuevo Usuario</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="user-form" onsubmit="saveUser(event)">
              <input type="hidden" id="user-id">
              <div class="mb-3">
                <label class="form-label">Nombre completo *</label>
                <input class="form-control form-control-light" id="user-name" required>
              </div>
              <div id="user-email-group" class="mb-3">
                <label class="form-label">Email *</label>
                <input class="form-control form-control-light" id="user-email" type="email" required>
              </div>
              <div id="user-password-group" class="mb-3">
                <label class="form-label">Contraseña *</label>
                <input class="form-control form-control-light" id="user-password" type="password" 
                       placeholder="Mín. 8 chars, mayúscula, número, símbolo">
              </div>
              <div class="mb-3">
                <label class="form-label">Rol *</label>
                <select class="form-select form-select-light" id="user-role">
                  <option value="VIEWER">Visualizador</option>
                  <option value="EDITOR">Editor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-light-custom" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-primary-light" onclick="document.getElementById('user-form').requestSubmit()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadUsers();
}

async function loadUsers(page = 1) {
  try {
    const data = await api.get(`/api/users?page=${page}&limit=10`);
    usersData = data.users;
    renderUsersTable(usersData);
    renderPagination('users', data, loadUsers);
  } catch (err) {
    document.getElementById('users-body').innerHTML =
      `<tr><td colspan="7" class="text-center py-4" style="color:#dc2626">${err.message}</td></tr>`;
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-body');
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="empty-icon">👥</span>No hay usuarios.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr style="${!u.isActive ? 'opacity:0.5' : ''}">
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="user-avatar ${getRoleAvatarClass(u.role)}" style="width:32px;height:32px;font-size:0.75rem;border-radius:10px">
            ${u.name.charAt(0)}
          </div>
          <span>${escHtml(u.name)}</span>
          ${u.id === AppState.user.id ? '<small style="color:var(--accent)">(tú)</small>' : ''}
        </div>
      </td>
      <td style="color:var(--text-muted)">${escHtml(u.email)}</td>
      <td><span class="role-badge role-${u.role.toLowerCase()}">${u.role}</span></td>
      <td>
        <span class="twofa-badge ${u.twoFAEnabled ? 'twofa-on' : 'twofa-off'}">
          ${u.twoFAEnabled ? '🔒 Sí' : '— No'}
        </span>
      </td>
      <td>
        <span style="font-size:0.75rem;color:${u.isActive ? '#16a34a' : '#94a3b8'}">
          ${u.isActive ? '● Activo' : '○ Inactivo'}
        </span>
      </td>
      <td style="color:var(--text-muted);font-size:0.8rem">
        ${u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-EC') : 'Nunca'}
      </td>
      <td>
        <button class="btn btn-sm btn-outline-light-custom me-1"
                onclick="openUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">✏️</button>
        ${u.id !== AppState.user.id ? `
        <button class="btn btn-sm" 
                style="background:${u.isActive ? 'rgba(220,38,38,.08)' : 'rgba(22,163,74,.08)'};
                       border:1px solid ${u.isActive ? 'rgba(220,38,38,.2)' : 'rgba(22,163,74,.2)'};
                       color:${u.isActive ? '#b91c1c' : '#15803d'};border-radius:var(--radius-sm)"
                onclick="toggleUserStatus('${u.id}','${escHtml(u.name)}',${u.isActive})">
          ${u.isActive ? '🔒' : '🔓'}
        </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function filterUsers(q) {
  const f = usersData.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.email.toLowerCase().includes(q.toLowerCase())
  );
  renderUsersTable(f);
}

function openUserModal(user = null) {
  const isEdit = !!user;
  document.getElementById('userModalTitle').textContent = isEdit ? 'Editar Usuario' : 'Nuevo Usuario';
  document.getElementById('user-id').value = user?.id || '';
  document.getElementById('user-name').value = user?.name || '';
  document.getElementById('user-email').value = user?.email || '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-role').value = user?.role || 'VIEWER';

  document.getElementById('user-email-group').style.display = isEdit ? 'none' : '';
  document.getElementById('user-password-group').style.display = isEdit ? 'none' : '';
  document.getElementById('user-email').required = !isEdit;
  document.getElementById('user-password').required = !isEdit;

  new bootstrap.Modal(document.getElementById('userModal')).show();
}

async function saveUser(e) {
  e.preventDefault();
  const id = document.getElementById('user-id').value;
  try {
    if (id) {
      await api.put(`/api/users/${id}`, {
        name: document.getElementById('user-name').value,
        role: document.getElementById('user-role').value,
      });
      showToast('Usuario actualizado.');
    } else {
      await api.post('/api/auth/register', {
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value,
      });
      showToast('Usuario creado.');
    }
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
    await loadUsers();
  } catch (err) { showToast(err.message, 'danger'); }
}

async function toggleUserStatus(id, name, isActive) {
  if (!confirm(`¿${isActive ? 'Desactivar' : 'Activar'} a "${name}"?`)) return;
  try {
    await api.patch(`/api/users/${id}/toggle-status`);
    showToast(`Usuario ${isActive ? 'desactivado' : 'activado'}.`);
    await loadUsers();
  } catch (err) { showToast(err.message, 'danger'); }
}
