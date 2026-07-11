// ─── Audit ─────────────────────────────────────────────────────────
async function audit() {
  if (AppState.user.role !== 'ADMIN') {
    document.getElementById('page-content').innerHTML =
      `<div class="empty-state"><span class="empty-icon">🔒</span>Acceso restringido al administrador.</div>`;
    return;
  }

  document.getElementById('page-content').innerHTML = `
    <div class="d-flex gap-2 mb-3 flex-wrap">
      <select class="form-select form-select-light" style="width:200px" onchange="loadAuditLogs(1,this.value)">
        <option value="">Todas las acciones</option>
        <option>LOGIN</option><option>LOGOUT</option><option>CREATE</option>
        <option>READ</option><option>UPDATE</option><option>DELETE</option>
        <option>LOGIN_FAILED</option><option>PERMISSION_DENIED</option>
        <option>PASSWORD_CHANGE</option><option>TWOFA_ENABLED</option>
        <option>TWOFA_DISABLED</option><option>TWOFA_VERIFIED</option><option>TWOFA_FAILED</option>
      </select>
    </div>
    <div class="card-light p-0 overflow-hidden">
      <table class="table table-light-custom table-hover mb-0">
        <thead>
          <tr>
            <th>Acción</th><th>Usuario</th><th>Entidad</th><th>Detalles</th><th>IP</th><th>Fecha</th>
          </tr>
        </thead>
        <tbody id="audit-body">
          <tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></td></tr>
        </tbody>
      </table>
    </div>
    <div id="audit-pagination" class="mt-3"></div>
  `;

  await loadAuditLogs();
}

async function loadAuditLogs(page = 1, action = '') {
  try {
    const params = new URLSearchParams({ page, limit: 20 });
    if (action) params.set('action', action);
    const data = await api.get(`/api/audit?${params}`);
    renderAuditTable(data.logs);
    renderPagination('audit', data, (p) => loadAuditLogs(p, action));
  } catch (err) {
    document.getElementById('audit-body').innerHTML =
      `<tr><td colspan="6" class="text-center py-4" style="color:#dc2626">${err.message}</td></tr>`;
  }
}

function renderAuditTable(logs) {
  const tbody = document.getElementById('audit-body');
  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="empty-icon">📋</span>Sin registros.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>
        <span class="action-${l.action.toLowerCase()}" style="font-size:0.72rem;font-weight:700">
          ${l.action}
        </span>
      </td>
      <td>
        <div style="font-size:0.8rem">${escHtml(l.user.name)}</div>
        <span class="role-badge role-${l.user.role.toLowerCase()}">${l.user.role}</span>
      </td>
      <td style="color:var(--text-muted);font-size:0.8rem">${l.entity || '—'}</td>
      <td style="color:var(--text-muted);font-size:0.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${l.details ? escHtml(l.details) : '—'}
      </td>
      <td style="color:var(--text-muted);font-size:0.78rem;font-family:monospace">${l.ipAddress || '—'}</td>
      <td style="color:var(--text-muted);font-size:0.78rem">${new Date(l.createdAt).toLocaleString('es-EC')}</td>
    </tr>
  `).join('');
}
