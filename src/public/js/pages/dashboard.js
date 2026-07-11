// ─── Dashboard ─────────────────────────────────────────────────────
async function dashboard() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="text-center py-5"><div class="spinner-border" style="color:var(--primary)" role="status"></div></div>`;

  try {
    const [userStats, auditStats, risks] = await Promise.all([
      AppState.user.role === 'ADMIN' ? api.get('/api/users/stats') : Promise.resolve(null),
      AppState.user.role === 'ADMIN' ? api.get('/api/audit/stats') : Promise.resolve(null),
      api.get('/api/risks/matrix'),
    ]);

    const riskCounts = { 'Crítico': 0, 'Alto': 0, 'Medio': 0, 'Bajo': 0 };
    risks.forEach(r => { if (riskCounts[r.riskLevel] !== undefined) riskCounts[r.riskLevel]++; });

    const recentAudit = auditStats?.recent || [];

    content.innerHTML = `
      <!-- Stats Row -->
      <div class="row g-3 mb-4">
        ${AppState.user.role === 'ADMIN' ? `
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="--accent-color:#6366f1">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="stat-value">${userStats?.total || 0}</div>
                <div class="stat-label">Total Usuarios</div>
              </div>
              <div class="stat-icon">👥</div>
            </div>
            <div class="mt-2" style="font-size:0.75rem;color:var(--text-muted)">
              ${userStats?.with2fa || 0} con 2FA activo
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="--accent-color:#16a34a">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="stat-value">${auditStats?.todayLogs || 0}</div>
                <div class="stat-label">Eventos Hoy</div>
              </div>
              <div class="stat-icon">📋</div>
            </div>
            <div class="mt-2" style="font-size:0.75rem;color:var(--text-muted)">
              ${auditStats?.totalLogs || 0} total
            </div>
          </div>
        </div>
        ` : ''}
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="--accent-color:#dc2626">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="stat-value" style="color:#dc2626">${riskCounts['Crítico'] + riskCounts['Alto']}</div>
                <div class="stat-label">Riesgos Altos</div>
              </div>
              <div class="stat-icon">⚠️</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="--accent-color:#14b8a6">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="stat-value">${risks.length}</div>
                <div class="stat-label">Total Riesgos</div>
              </div>
              <div class="stat-icon">🔍</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <!-- Perfil -->
        <div class="col-12 col-lg-4">
          <div class="card-light h-100">
            <h6 class="mb-3" style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase;letter-spacing:.05em">
              Tu perfil de acceso
            </h6>
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="user-avatar ${getRoleAvatarClass(AppState.user.role)}" style="width:48px;height:48px;font-size:1.1rem;border-radius:14px">
                ${AppState.user.name.charAt(0)}
              </div>
              <div>
                <strong>${AppState.user.name}</strong>
                <div><span class="role-badge role-${AppState.user.role.toLowerCase()}">${AppState.user.role}</span></div>
              </div>
            </div>
            <hr style="border-color:var(--border)">
            <div style="font-size:0.8rem">
              <div class="mb-2"><span style="color:var(--text-muted)">Email:</span> ${AppState.user.email}</div>
              <div class="mb-2">
                <span style="color:var(--text-muted)">2FA:</span> 
                <span class="twofa-badge ${AppState.user.twoFAEnabled ? 'twofa-on' : 'twofa-off'}">
                  ${AppState.user.twoFAEnabled ? '🔒 Activo' : '⚠ Inactivo'}
                </span>
              </div>
              ${renderRolePermissions()}
            </div>
            ${!AppState.user.twoFAEnabled ? `
            <button class="btn btn-primary-light w-100 mt-2" onclick="navigateTo('security')">
              🔐 Activar verificación en dos pasos
            </button>
            ` : ''}
          </div>
        </div>

        <!-- Distribución de riesgos -->
        <div class="col-12 col-lg-4">
          <div class="card-light h-100">
            <h6 class="mb-3" style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase;letter-spacing:.05em">
              Distribución de riesgos
            </h6>
            ${Object.entries(riskCounts).map(([level, count]) => `
              <div class="mb-2">
                <div class="d-flex justify-content-between mb-1">
                  <span style="font-size:0.8rem">${level}</span>
                  <span style="font-size:0.8rem;color:var(--text-muted)">${count}</span>
                </div>
                <div style="background:var(--surface-2);border-radius:6px;height:8px">
                  <div style="width:${risks.length ? (count/risks.length*100) : 0}%;height:100%;border-radius:6px;
                       background:${{'Crítico':'#dc2626','Alto':'#d97706','Medio':'#6366f1','Bajo':'#16a34a'}[level]}">
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Actividad reciente (admin) -->
        ${AppState.user.role === 'ADMIN' ? `
        <div class="col-12 col-lg-4">
          <div class="card-light h-100">
            <h6 class="mb-3" style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase;letter-spacing:.05em">
              Actividad reciente
            </h6>
            ${recentAudit.length ? recentAudit.map(log => `
              <div class="d-flex align-items-start gap-2 mb-3">
                <span class="action-${log.action.toLowerCase()}" style="font-size:0.72rem;font-weight:700;min-width:90px">
                  ${log.action}
                </span>
                <div style="font-size:0.8rem">
                  <div>${log.user.name}</div>
                  <div style="color:var(--text-muted);font-size:0.72rem">${new Date(log.createdAt).toLocaleString('es-EC')}</div>
                </div>
              </div>
            `).join('') : '<p class="text-muted-custom small">Sin actividad reciente.</p>'}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="alert" style="background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);color:#b91c1c;border-radius:var(--radius)">
      Error cargando dashboard: ${err.message}</div>`;
  }
}

function renderRolePermissions() {
  const perms = {
    ADMIN:  ['Ver todo el sistema', 'Crear / editar / eliminar', 'Gestionar usuarios', 'Ver auditoría'],
    EDITOR: ['Ver registros propios y públicos', 'Crear y editar sus registros', 'Ver activos y riesgos'],
    VIEWER: ['Solo lectura', 'Ver registros públicos', 'Ver activos y riesgos'],
  };
  return (perms[AppState.user.role] || []).map(p =>
    `<div class="mb-1">✓ <span style="color:var(--text-primary)">${p}</span></div>`
  ).join('');
}
