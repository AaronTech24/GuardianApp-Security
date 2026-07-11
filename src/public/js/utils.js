// ─── Utility Helpers ───────────────────────────────────────────────

/** Escape HTML to prevent XSS */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getRoleAvatarClass(role) {
  return { ADMIN: 'avatar-admin', EDITOR: 'avatar-editor', VIEWER: 'avatar-viewer' }[role] || '';
}

/** Render pagination controls */
function renderPagination(prefix, data, loadFn) {
  const el = document.getElementById(`${prefix}-pagination`);
  if (!el) return;

  const { page, pages, total } = data;
  if (pages <= 1) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <small class="text-muted-custom">
      ${((page-1)*10)+1}–${Math.min(page*10, total)} de ${total} registros
    </small>
    <div class="d-flex gap-1">
      <button class="btn btn-sm btn-outline-light-custom"
              onclick="(${loadFn})(${page-1})" ${page===1?'disabled':''}>‹</button>
      ${Array.from({length: Math.min(5, pages)}, (_, i) => {
        const p = Math.max(1, Math.min(page - 2 + i, pages - 4 + i));
        return `<button class="btn btn-sm ${p===page?'btn-primary-light':'btn-outline-light-custom'}"
                        onclick="(${loadFn})(${p})">${p}</button>`;
      }).join('')}
      <button class="btn btn-sm btn-outline-light-custom"
              onclick="(${loadFn})(${page+1})" ${page===pages?'disabled':''}>›</button>
    </div>
  `;
}
