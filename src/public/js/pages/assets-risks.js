// ─── Assets ────────────────────────────────────────────────────────
async function assets() {
  const canEdit = ['ADMIN', 'EDITOR'].includes(AppState.user.role);
  document.getElementById('page-content').innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <h6 class="mb-0 text-muted-custom">Inventario de activos de información</h6>
      ${canEdit ? `<button class="btn btn-primary-light" onclick="openAssetModal()">+ Nuevo activo</button>` : ''}
    </div>
    <div id="assets-grid" class="row g-3">
      <div class="col-12 text-center py-5"><div class="spinner-border" style="color:var(--primary)"></div></div>
    </div>

    <div class="modal modal-light fade" id="assetModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="assetModalTitle">Nuevo Activo</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="asset-form" onsubmit="saveAsset(event)">
              <input type="hidden" id="asset-id">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Nombre *</label>
                  <input class="form-control form-control-light" id="asset-name" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Tipo *</label>
                  <select class="form-select form-select-light" id="asset-type">
                    <option>Base de Datos</option><option>Hardware</option><option>Software</option>
                    <option>Red</option><option>Persona</option><option>Instalaciones</option><option>Documento</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Descripción *</label>
                  <textarea class="form-control form-control-light" id="asset-description" rows="2" required></textarea>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Confidencialidad</label>
                  <select class="form-select form-select-light" id="asset-confidentiality">
                    <option>Alta</option><option>Media</option><option>Baja</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Integridad</label>
                  <select class="form-select form-select-light" id="asset-integrity">
                    <option>Alta</option><option>Media</option><option>Baja</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Disponibilidad</label>
                  <select class="form-select form-select-light" id="asset-availability">
                    <option>Alta</option><option>Media</option><option>Baja</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Propietario *</label>
                  <input class="form-control form-control-light" id="asset-owner" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Ubicación</label>
                  <input class="form-control form-control-light" id="asset-location">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-light-custom" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-primary-light" onclick="document.getElementById('asset-form').requestSubmit()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  await loadAssets();
}

async function loadAssets() {
  try {
    const data = await api.get('/api/assets');
    const grid = document.getElementById('assets-grid');
    const canEdit = ['ADMIN', 'EDITOR'].includes(AppState.user.role);

    if (!data.length) {
      grid.innerHTML = `<div class="col-12"><div class="empty-state"><span class="empty-icon">🗄️</span>No hay activos registrados.</div></div>`;
      return;
    }

    grid.innerHTML = data.map(a => `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card-light h-100">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <span style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;font-weight:600">${a.type}</span>
              <h6 class="mb-0 mt-1">${escHtml(a.name)}</h6>
            </div>
            <span style="font-size:1.5rem">${assetTypeIcon(a.type)}</span>
          </div>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">${escHtml(a.description)}</p>
          <div class="row g-1 mb-3">
            ${['C','I','D'].map((label, i) => {
              const val = [a.confidentiality, a.integrity, a.availability][i];
              const color = { Alta:'#dc2626', Media:'#d97706', Baja:'#16a34a' }[val];
              const bg    = { Alta:'rgba(220,38,38,.08)', Media:'rgba(217,119,6,.08)', Baja:'rgba(22,163,74,.08)' }[val];
              return `<div class="col-4 text-center" style="background:${bg};border-radius:8px;padding:0.4rem">
                <div style="font-size:0.68rem;color:var(--text-muted);font-weight:600">${['Conf.','Integ.','Disp.'][i]}</div>
                <div style="font-size:0.78rem;font-weight:700;color:${color}">${val}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted)">
            👤 ${escHtml(a.owner)} ${a.location ? `· 📍 ${escHtml(a.location)}` : ''}
          </div>
          ${a.risks.length ? `<div class="mt-2" style="font-size:0.75rem;color:#d97706">⚠️ ${a.risks.length} riesgo(s)</div>` : ''}
          ${canEdit ? `
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-sm btn-outline-light-custom flex-fill"
                    onclick="openAssetModal(${JSON.stringify(a).replace(/"/g,'&quot;')})">✏️ Editar</button>
            ${AppState.user.role === 'ADMIN' ? `
            <button class="btn btn-sm" style="background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);color:#b91c1c;border-radius:var(--radius-sm)"
                    onclick="deleteAsset('${a.id}','${escHtml(a.name)}')">🗑️</button>
            ` : ''}
          </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('assets-grid').innerHTML =
      `<div class="col-12 text-center py-4" style="color:#dc2626">${err.message}</div>`;
  }
}

function assetTypeIcon(type) {
  const icons = { 'Base de Datos':'🗄️','Hardware':'🖥️','Software':'💿','Red':'🌐','Persona':'👤','Instalaciones':'🏢','Documento':'📄' };
  return icons[type] || '📦';
}

function openAssetModal(asset = null) {
  document.getElementById('assetModalTitle').textContent = asset ? 'Editar Activo' : 'Nuevo Activo';
  document.getElementById('asset-id').value = asset?.id || '';
  document.getElementById('asset-name').value = asset?.name || '';
  document.getElementById('asset-type').value = asset?.type || 'Base de Datos';
  document.getElementById('asset-description').value = asset?.description || '';
  document.getElementById('asset-confidentiality').value = asset?.confidentiality || 'Alta';
  document.getElementById('asset-integrity').value = asset?.integrity || 'Alta';
  document.getElementById('asset-availability').value = asset?.availability || 'Alta';
  document.getElementById('asset-owner').value = asset?.owner || '';
  document.getElementById('asset-location').value = asset?.location || '';
  new bootstrap.Modal(document.getElementById('assetModal')).show();
}

async function saveAsset(e) {
  e.preventDefault();
  const id = document.getElementById('asset-id').value;
  const body = {
    name: document.getElementById('asset-name').value,
    type: document.getElementById('asset-type').value,
    description: document.getElementById('asset-description').value,
    confidentiality: document.getElementById('asset-confidentiality').value,
    integrity: document.getElementById('asset-integrity').value,
    availability: document.getElementById('asset-availability').value,
    owner: document.getElementById('asset-owner').value,
    location: document.getElementById('asset-location').value,
  };
  try {
    if (id) { await api.put(`/api/assets/${id}`, body); showToast('Activo actualizado.'); }
    else     { await api.post('/api/assets', body);      showToast('Activo creado.'); }
    bootstrap.Modal.getInstance(document.getElementById('assetModal')).hide();
    await loadAssets();
  } catch (err) { showToast(err.message, 'danger'); }
}

async function deleteAsset(id, name) {
  if (!confirm(`¿Eliminar activo "${name}" y sus riesgos asociados?`)) return;
  try {
    await api.delete(`/api/assets/${id}`);
    showToast('Activo eliminado.', 'warning');
    await loadAssets();
  } catch (err) { showToast(err.message, 'danger'); }
}

// ─── Risks ─────────────────────────────────────────────────────────
async function risks() {
  const canEdit = ['ADMIN', 'EDITOR'].includes(AppState.user.role);
  document.getElementById('page-content').innerHTML = `
    <div class="row g-3 mb-4">
      <div class="col-12 col-lg-8">
        <div class="card-light">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">Matriz de Riesgos 5×5</h6>
            <small class="text-muted-custom">Probabilidad × Impacto</small>
          </div>
          <div id="risk-matrix-container">Cargando...</div>
        </div>
      </div>
      <div class="col-12 col-lg-4">
        <div class="card-light h-100">
          <h6 class="mb-3">Leyenda</h6>
          ${[['#dc2626','Crítico (16-25)'],['#d97706','Alto (9-15)'],['#6366f1','Medio (4-8)'],['#16a34a','Bajo (1-3)']].map(([c,t]) => `
          <div class="mb-2 d-flex align-items-center gap-2">
            <span style="width:14px;height:14px;border-radius:3px;background:${c};display:inline-block"></span>
            <small>${t}</small>
          </div>`).join('')}
          <hr style="border-color:var(--border)">
          <small class="text-muted-custom">Cada celda muestra el número de riesgos en ese cruce de probabilidad × impacto</small>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="mb-0">Lista de riesgos</h6>
      ${canEdit ? `<button class="btn btn-primary-light" onclick="openRiskModal()">+ Nuevo riesgo</button>` : ''}
    </div>
    <div class="card-light p-0 overflow-hidden">
      <table class="table table-light-custom table-hover mb-0">
        <thead>
          <tr>
            <th>Riesgo</th><th>Activo</th><th>P</th><th>I</th><th>Nivel</th><th>Control</th><th>Estado</th>
            ${canEdit ? '<th></th>' : ''}
          </tr>
        </thead>
        <tbody id="risks-body">
          <tr><td colspan="8" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></td></tr>
        </tbody>
      </table>
    </div>

    <div class="modal modal-light fade" id="riskModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="riskModalTitle">Nuevo Riesgo</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="risk-form" onsubmit="saveRisk(event)">
              <input type="hidden" id="risk-id">
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label">Nombre del riesgo *</label>
                  <input class="form-control form-control-light" id="risk-name" required>
                </div>
                <div class="col-12">
                  <label class="form-label">Descripción *</label>
                  <textarea class="form-control form-control-light" id="risk-description" rows="2" required></textarea>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Probabilidad (1-5) *</label>
                  <select class="form-select form-select-light" id="risk-probability">
                    <option value="1">1 - Muy baja</option><option value="2">2 - Baja</option>
                    <option value="3">3 - Media</option><option value="4">4 - Alta</option>
                    <option value="5">5 - Muy alta</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Impacto (1-5) *</label>
                  <select class="form-select form-select-light" id="risk-impact">
                    <option value="1">1 - Muy bajo</option><option value="2">2 - Bajo</option>
                    <option value="3">3 - Medio</option><option value="4">4 - Alto</option>
                    <option value="5">5 - Muy alto</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Estado</label>
                  <select class="form-select form-select-light" id="risk-status">
                    <option>Pendiente</option><option>En proceso</option><option>Mitigado</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Control propuesto *</label>
                  <textarea class="form-control form-control-light" id="risk-control" rows="2" required></textarea>
                </div>
                <div class="col-12">
                  <label class="form-label">Activo afectado *</label>
                  <select class="form-select form-select-light" id="risk-asset" required>
                    <option value="">Cargando activos...</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-light-custom" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-primary-light" onclick="document.getElementById('risk-form').requestSubmit()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadRisks();
}

async function loadRisks() {
  try {
    const [data, matrix] = await Promise.all([api.get('/api/risks'), api.get('/api/risks/matrix')]);
    renderRisksTable(data);
    renderRiskMatrix(matrix);
  } catch (err) {
    document.getElementById('risks-body').innerHTML =
      `<tr><td colspan="8" class="text-center py-4" style="color:#dc2626">${err.message}</td></tr>`;
  }
}

function renderRiskMatrix(risks) {
  const container = document.getElementById('risk-matrix-container');
  const grid = {};
  risks.forEach(r => { const key = `${r.probability}-${r.impact}`; grid[key] = (grid[key] || 0) + 1; });

  const getCellClass = (p, i) => {
    const s = p * i;
    if (s >= 16) return 'matrix-critical';
    if (s >= 9)  return 'matrix-high';
    if (s >= 4)  return 'matrix-medium';
    return 'matrix-low';
  };

  let html = `<div style="display:flex;flex-direction:column;gap:4px">
    <div style="display:flex;gap:4px;align-items:center">
      <div style="width:55px;font-size:0.62rem;color:var(--text-muted);text-align:center">Impacto ↕</div>
      ${[1,2,3,4,5].map(p => `<div style="width:60px;text-align:center;font-size:0.62rem;color:var(--text-muted)">P=${p}</div>`).join('')}
    </div>`;

  for (let impact = 5; impact >= 1; impact--) {
    html += `<div style="display:flex;gap:4px;align-items:center">
      <div style="width:55px;font-size:0.62rem;color:var(--text-muted);text-align:center">I=${impact}</div>`;
    for (let prob = 1; prob <= 5; prob++) {
      const count = grid[`${prob}-${impact}`] || 0;
      html += `<div class="matrix-cell ${getCellClass(prob, impact)}" title="P=${prob}, I=${impact}, Score=${prob*impact}">
        ${count > 0 ? `<span style="font-size:1rem;font-weight:800">${count}</span>` : ''}
      </div>`;
    }
    html += `</div>`;
  }

  html += `<div style="display:flex;gap:4px;align-items:center">
    <div style="width:55px"></div>
    ${[1,2,3,4,5].map(p => `<div style="width:60px;text-align:center;font-size:0.6rem;color:var(--text-muted)">${['M.Baja','Baja','Media','Alta','M.Alta'][p-1]}</div>`).join('')}
  </div></div>`;

  container.innerHTML = html;
}

function renderRisksTable(risks) {
  const canEdit = ['ADMIN', 'EDITOR'].includes(AppState.user.role);
  const tbody = document.getElementById('risks-body');
  if (!risks.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><span class="empty-icon">✅</span>No hay riesgos registrados.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = risks.map(r => `
    <tr>
      <td>
        <strong style="font-size:0.875rem">${escHtml(r.name)}</strong>
        <div style="font-size:0.75rem;color:var(--text-muted)">${escHtml(r.description).substring(0,55)}...</div>
      </td>
      <td style="font-size:0.8rem">${r.asset ? escHtml(r.asset.name) : '—'}</td>
      <td class="text-center"><strong>${r.probability}</strong></td>
      <td class="text-center"><strong>${r.impact}</strong></td>
      <td><span class="risk-${r.riskLevel.toLowerCase()}">${r.riskLevel}</span></td>
      <td style="font-size:0.78rem;color:var(--text-muted);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.control)}</td>
      <td>
        <span style="font-size:0.75rem;font-weight:600;color:${{Pendiente:'#dc2626','En proceso':'#d97706',Mitigado:'#16a34a'}[r.status]||'#64748b'}">
          ${r.status}
        </span>
      </td>
      ${canEdit ? `
      <td>
        <button class="btn btn-sm btn-outline-light-custom me-1"
                onclick="openRiskModal(${JSON.stringify(r).replace(/"/g,'&quot;')})">✏️</button>
        ${AppState.user.role === 'ADMIN' ? `
        <button class="btn btn-sm" style="background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);color:#b91c1c;border-radius:var(--radius-sm)"
                onclick="deleteRisk('${r.id}')">🗑️</button>
        ` : ''}
      </td>` : ''}
    </tr>
  `).join('');
}

async function openRiskModal(risk = null) {
  document.getElementById('riskModalTitle').textContent = risk ? 'Editar Riesgo' : 'Nuevo Riesgo';
  document.getElementById('risk-id').value = risk?.id || '';
  document.getElementById('risk-name').value = risk?.name || '';
  document.getElementById('risk-description').value = risk?.description || '';
  document.getElementById('risk-probability').value = risk?.probability || '3';
  document.getElementById('risk-impact').value = risk?.impact || '3';
  document.getElementById('risk-control').value = risk?.control || '';
  document.getElementById('risk-status').value = risk?.status || 'Pendiente';

  const assetSelect = document.getElementById('risk-asset');
  assetSelect.innerHTML = '<option value="">Cargando...</option>';
  const assetData = await api.get('/api/assets');
  assetSelect.innerHTML = assetData.map(a =>
    `<option value="${a.id}" ${risk?.assetId === a.id ? 'selected' : ''}>${escHtml(a.name)}</option>`
  ).join('');

  new bootstrap.Modal(document.getElementById('riskModal')).show();
}

async function saveRisk(e) {
  e.preventDefault();
  const id = document.getElementById('risk-id').value;
  const body = {
    name: document.getElementById('risk-name').value,
    description: document.getElementById('risk-description').value,
    probability: parseInt(document.getElementById('risk-probability').value),
    impact: parseInt(document.getElementById('risk-impact').value),
    control: document.getElementById('risk-control').value,
    status: document.getElementById('risk-status').value,
    assetId: document.getElementById('risk-asset').value,
  };
  try {
    if (id) { await api.put(`/api/risks/${id}`, body); showToast('Riesgo actualizado.'); }
    else     { await api.post('/api/risks', body);      showToast('Riesgo registrado.'); }
    bootstrap.Modal.getInstance(document.getElementById('riskModal')).hide();
    await loadRisks();
  } catch (err) { showToast(err.message, 'danger'); }
}

async function deleteRisk(id) {
  if (!confirm('¿Eliminar este riesgo?')) return;
  try {
    await api.delete(`/api/risks/${id}`);
    showToast('Riesgo eliminado.', 'warning');
    await loadRisks();
  } catch (err) { showToast(err.message, 'danger'); }
}
