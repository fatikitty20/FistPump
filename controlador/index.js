// Patched to use API
import('./api.js');

function toggleMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
}


// Auto-wired submit: send to backend aligned with schema
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        await apiFetch('/servicios/create', { method:'POST', body: JSON.stringify(data) });
        alert('Servicios agregado correctamente.');
        form.reset();
        if (typeof loadList === 'function') loadList();
      } catch(err) {
        alert('Error al guardar: ' + err.message);
      }
    });
  }
  if (typeof loadList === 'function') loadList();
});

async function loadList(){
  const listEl = document.getElementById('list');
  if (!listEl) return;
  try {
    const rows = await apiFetch('/servicios/list', { method: 'GET' });
    if (!Array.isArray(rows)) throw new Error('Respuesta inesperada');
    let html = '<table><thead><tr>';
    if (rows.length) {
      Object.keys(rows[0]).forEach(k=> html += `<th>${k}</th>`);
      html += '<th>Acciones</th>';
    }
    html += '</tr></thead><tbody>';
    rows.forEach(r=> {
      html += '<tr>';
      if (rows.length) Object.values(r).forEach(v=> html += `<td>${v??''}</td>`);
      html += `<td><button data-id="${r.id||r.telefono||''}" class="btn-del">Eliminar</button></td>`;
      html += '</tr>';
    });
    html += '</tbody></table>';
    listEl.innerHTML = html;
    listEl.querySelectorAll('.btn-del').forEach(btn=> btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!confirm('¿Eliminar registro?')) return;
      try {
        await apiFetch(`/servicios/delete/${encodeURIComponent(id)}`, { method:'DELETE' });
        loadList();
      } catch(err) {
        alert('Error al eliminar: ' + err.message);
      }
    }));
  } catch(err) {
    listEl.innerHTML = '<p>No se pudo cargar la lista: ' + err.message + '</p>';
  }
}
