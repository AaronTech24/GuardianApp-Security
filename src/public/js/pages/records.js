// ─── Records ───────────────────────────────────────────────────────
let recordsData = [];

async function records() {
  const content = document.getElementById('page-content');
  const canEdit = ['ADMIN', 'EDITOR'].includes(AppState.user.role);

  content.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <input type="search" class="form-control form-control-light" style="width:240px" 
             placeholder="Buscar..." oninput="filterRecords(this.value)">
      ${canEdit ? `<button class="btn btn-primary-light" onclick="openRecordModal()">+ Nuevo registro</button>` : ''}
    </div>
    <div class="card-light p-0 overflow-hidden">
      <table class="table table-light-custom table-hover mb-0">
        <thead>
          <tr>
            <th>Título</th><th>Descripción</th><th>Autor</th><th>Visibilidad</th><th>Fecha</th>
            ${canEdit ? '<th>Acciones</th>' : ''}
          </tr>
        </thead>
        <tbody id="records-body">
          <tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></td></tr>
        </tbody>
      </table>
    </div>
    <div id="records-pagination" class="mt-3 d-flex justify-content-between align-items-center"></div>

    <div class="modal modal-light fade" id="recordModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="recordModalTitle">Nuevo Registro</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="record-form" onsubmit="saveRecord(event)">
              <input type="hidden" id="record-id">
              <div class="mb-3">
                <label class="form-label">Título *</label>
                <input class="form-control form-control-light" id="record-title" required maxlength="120">
              </div>
              <div class="mb-3">
                <label class="form-label">Descripción *</label>
                <input class="form-control form-control-light" id="record-description" required maxlength="255">
              </div>
              <div class="mb-3">
                <label class="form-label">Contenido *</label>
                <textarea class="form-control form-control-light" id="record-content" rows="5" required></textarea>
              </div>
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="record-public">
                <label class="form-check-label" style="color:var(--text-muted)">Registro público</label>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-light-custom" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-primary-light" onclick="document.getElementById('record-form').requestSubmit()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadRecords();
}

async function loadRecords(page = 1) {
  try {
    const data = await api.get(`/api/records?page=${page}&limit=10`);
    recordsData = data.records;
    renderRecordsTable(recordsData);
    renderPagination('records', data, loadRecords);
  } catch (err) {
    document.getElementById('records-body').innerHTML =
      `<tr><td colspan="6" class="text-center py-4" style="color:#dc2626">${err.message}</td></tr>`;
  }
}

function renderRecordsTable(records) {
  const canEdit = ['ADMIN', 'EDITOR'].includes(AppState.user.role);
  const tbody = document.getElementById('records-body');
  if (!records.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="empty-icon">📁</span>No hay registros.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = records.map(r => `
    <tr>
      <td><strong>${escHtml(r.title)}</strong></td>
      <td style="color:var(--text-muted)">${escHtml(r.description)}</td>
      <td><span class="role-badge role-${r.author.role.toLowerCase()}">${r.author.name}</span></td>
      <td>
        <span style="font-size:0.75rem;color:${r.isPublic ? '#16a34a' : '#94a3b8'}">
          ${r.isPublic ? '🌐 Público' : '🔒 Privado'}
        </span>
      </td>
      <td style="color:var(--text-muted);font-size:0.8rem">${new Date(r.createdAt).toLocaleDateString('es-EC')}</td>
      ${canEdit ? `
      <td>
        <button class="btn btn-sm btn-outline-light-custom me-1" 
                onclick="openRecordModal(${JSON.stringify(r).replace(/"/g, '&quot;')})">✏️</button>
        ${AppState.user.role === 'ADMIN' || r.authorId === AppState.user.id ? `
        <button class="btn btn-sm" style="background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);color:#b91c1c;border-radius:var(--radius-sm)" 
                onclick="deleteRecord('${r.id}','${escHtml(r.title)}')">🗑️</button>
        ` : ''}
      </td>
      ` : ''}
    </tr>
  `).join('');
}

function filterRecords(q) {
  const filtered = recordsData.filter(r =>
    r.title.toLowerCase().includes(q.toLowerCase()) ||
    r.description.toLowerCase().includes(q.toLowerCase())
  );
  renderRecordsTable(filtered);
}

function openRecordModal(record = null) {
  document.getElementById('recordModalTitle').textContent = record ? 'Editar Registro' : 'Nuevo Registro';
  document.getElementById('record-id').value = record?.id || '';
  document.getElementById('record-title').value = record?.title || '';
  document.getElementById('record-description').value = record?.description || '';
  document.getElementById('record-content').value = record?.content || '';
  document.getElementById('record-public').checked = record?.isPublic || false;
  new bootstrap.Modal(document.getElementById('recordModal')).show();
}

async function saveRecord(e) {
  e.preventDefault();
  const id = document.getElementById('record-id').value;
  const body = {
    title:       document.getElementById('record-title').value,
    description: document.getElementById('record-description').value,
    content:     document.getElementById('record-content').value,
    isPublic:    document.getElementById('record-public').checked,
  };
  try {
    if (id) { await api.put(`/api/records/${id}`, body); showToast('Registro actualizado.'); }
    else     { await api.post('/api/records', body);      showToast('Registro creado.'); }
    bootstrap.Modal.getInstance(document.getElementById('recordModal')).hide();
    await loadRecords();
  } catch (err) { showToast(err.message, 'danger'); }
}

async function deleteRecord(id, title) {
  if (!confirm(`¿Eliminar "${title}"?`)) return;
  try {
    await api.delete(`/api/records/${id}`);
    showToast('Registro eliminado.', 'warning');
    await loadRecords();
  } catch (err) { showToast(err.message, 'danger'); }
}
