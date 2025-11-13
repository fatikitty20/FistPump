// controlador/servicios.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const tbody   = $('#tablaServicios tbody');
const buscar  = $('#buscarNombre');
const btnMenu = document.querySelector('.menu-toggle');

function dinero(n) {
  if (n == null || Number.isNaN(Number(n))) return '';
  return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function render(rows = []) {
  tbody.innerHTML = '';
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5">No hay servicios registrados.</td></tr>';
    return;
  }
  for (const s of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.nombre ?? ''}</td>
      <td>${s.descripcion ?? ''}</td>
      <td>${dinero(s.costo)}</td>
      <td>${s.duracion ?? ''}</td>
      <td>
        <button class="btn-editar" data-id="${s.id}">
          <i class="fa-solid fa-pen-to-square"></i> Editar
        </button>
        <button class="btn-eliminar" data-id="${s.id}">
          <i class="fa-solid fa-trash"></i> Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function listarServicios(filtroNombre = '') {
  let q = sb.from('servicios')
            .select('id, nombre, descripcion, costo, duracion')
            .order('id', { ascending: true })
            .limit(500);
  if (filtroNombre) q = q.ilike('nombre', `%${filtroNombre}%`);
  const { data, error } = await q;
  if (error) {
    console.error(error);
    alert('No se pudieron cargar los servicios: ' + error.message);
    return [];
  }
  return data || [];
}

async function refrescar() {
  const rows = await listarServicios(buscar?.value?.trim() || '');
  render(rows);
}

tbody.addEventListener('click', async (e) => {
  const del = e.target.closest('.btn-eliminar');
  const edit = e.target.closest('.btn-editar');
  if (edit) {
    const id = edit.dataset.id;
    location.href = `add_servicio.html?id=${encodeURIComponent(id)}`;
    return;
  }
  if (del) {
    const id = Number(del.dataset.id);
    if (!Number.isFinite(id)) return;
    if (!confirm('¿Eliminar este servicio?')) return;
    const { error } = await sb.from('servicios').delete().eq('id', id);
    if (error) {
      console.error(error);
      return alert('Error al eliminar: ' + error.message);
    }
    await refrescar();
  }
});

buscar?.addEventListener('input', refrescar);

btnMenu?.addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  const visible = getComputedStyle(sidebar).display !== 'none';
  sidebar.style.display = visible ? 'none' : 'flex';
});

document.addEventListener('DOMContentLoaded', refrescar);
