// controlador/cuentas.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const tbody   = $('#tablaCuentas tbody');
const qRol    = $('#buscarrol');
const btnMenu = document.querySelector('.menu-toggle');

function render(rows, usersById, rolesById) {
  tbody.innerHTML = '';
  if (!rows?.length) {
    tbody.innerHTML = '<tr><td colspan="5">No hay cuentas registradas.</td></tr>';
    return;
  }
  for (const cta of rows) {
    const u   = usersById.get(String(cta.usuario_id)); // Map con clave string
    const rol = rolesById.get(String(u?.rol_id));
    const tr  = document.createElement('tr');
    tr.innerHTML = `
      <td>${rol?.nombre ?? '(sin rol)'}</td>
      <td>${u?.nombre ?? ''}</td>
      <td>${u?.telefono ?? ''}</td>
      <td>${u?.correo ?? ''}</td>
      <td>
        <button class="btn-editar" data-id="${cta.id}">
          <i class="fa-solid fa-pen-to-square"></i> Editar
        </button>
        <button class="btn-eliminar" data-id="${cta.id}">
          <i class="fa-solid fa-trash"></i> Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function fetchAll() {
  const [rCtas, rUsers, rRoles] = await Promise.all([
    sb.from('cuenta').select('id,usuario_id').order('id'),
    sb.from('usuarios').select('id,nombre,telefono,correo,rol_id'),
    sb.from('roles').select('id,nombre')
  ]);

  if (rCtas.error || rUsers.error || rRoles.error) {
    console.error(rCtas.error || rUsers.error || rRoles.error);
    alert('No se pudieron cargar cuentas.');
    return { cuentas: [], usersById: new Map(), rolesById: new Map() };
  }

  // Mapear usando claves string para evitar Number vs String
  const usersById = new Map((rUsers.data ?? []).map(u => [String(u.id), u]));
  const rolesById = new Map((rRoles.data ?? []).map(r => [String(r.id), r]));
  return { cuentas: rCtas.data ?? [], usersById, rolesById };
}

let _cache = { cuentas: [], usersById: new Map(), rolesById: new Map() };
async function cargar() {
  _cache = await fetchAll();
  render(_cache.cuentas, _cache.usersById, _cache.rolesById);
}

function filtrarPorRol(txt) {
  const t = (txt || '').trim().toLowerCase();
  if (!t) return render(_cache.cuentas, _cache.usersById, _cache.rolesById);

  const filtradas = _cache.cuentas.filter(cta => {
    const u   = _cache.usersById.get(String(cta.usuario_id));
    const rol = _cache.rolesById.get(String(u?.rol_id));
    return (rol?.nombre || '').toLowerCase().includes(t);
    // También podrías filtrar por nombre/telefono/correo si quieres
  });
  render(filtradas, _cache.usersById, _cache.rolesById);
}

// Acciones
tbody.addEventListener('click', async (e) => {
  const bEdit = e.target.closest('.btn-editar');
  const bDel  = e.target.closest('.btn-eliminar');

  if (bEdit) {
    location.href = `add_cuenta.html?id=${bEdit.dataset.id}`;
    return;
  }

  if (bDel) {
    const id = Number(bDel.dataset.id);
    if (!confirm('¿Eliminar esta cuenta?')) return;

    // obtener usuario_id primero
    const { data: cta, error: e0 } = await sb.from('cuenta').select('usuario_id').eq('id', id).single();
    if (e0) return alert('No se pudo leer la cuenta: ' + e0.message);

    const { error: eDelC } = await sb.from('cuenta').delete().eq('id', id);
    if (eDelC) return alert('No se pudo eliminar la cuenta: ' + eDelC.message);

    // borra usuario asociado
    await sb.from('usuarios').delete().eq('id', cta.usuario_id);

    await cargar();
  }
});

// UI
qRol?.addEventListener('input', () => filtrarPorRol(qRol.value));
btnMenu?.addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  sidebar.style.display = getComputedStyle(sidebar).display !== 'none' ? 'none' : 'flex';
});

document.addEventListener('DOMContentLoaded', cargar);
