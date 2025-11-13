// controlador/clientes.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const tbody   = $('#tablaClientes tbody');
const buscar  = $('#buscarEmail');
const btnMenu = document.querySelector('.menu-toggle');

// ---- Render ----
function renderTabla(rows = []) {
  tbody.innerHTML = '';
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4">No hay clientes registrados.</td></tr>';
    return;
  }
  for (const c of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.nombre ?? ''} ${c.paterno ?? ''} ${c.materno ?? ''}</td>
      <td>${c.telefono ?? ''}</td>
      <td>${c.email ?? ''}</td>
      <td>
        <button class="btn-editar" data-tel="${c.telefono}">
          <i class="fa-solid fa-pen-to-square"></i> Editar
        </button>
        <button class="btn-eliminar" data-tel="${c.telefono}">
          <i class="fa-solid fa-trash"></i> Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

// ---- Data ----
async function listarClientes(filtroEmail = '') {
  let q = sb.from('clientes')
    .select('nombre, paterno, materno, telefono, email')
    .order('telefono', { ascending: true })
    .limit(500);

  if (filtroEmail) q = q.ilike('email', `%${filtroEmail}%`);

  const { data, error } = await q;
  if (error) {
    alert('No se pudieron cargar los clientes: ' + error.message);
    return [];
  }
  return data || [];
}

// ---- Borrado en cascada (mascotas -> cliente) ----
async function eliminarClientePorTelefono(tel) {
  // borra mascotas del cliente para no violar la FK
  let { error: eM } = await sb.from('mascotas').delete().eq('cli_tel', tel);
  if (eM) return { error: eM };

  // borra el cliente
  let { error: eC } = await sb.from('clientes').delete().eq('telefono', tel);
  return { error: eC };
}

// ---- UI ----
async function cargar(filtro = '') {
  renderTabla(await listarClientes(filtro));
}

tbody.addEventListener('click', async (e) => {
  const bEdit = e.target.closest('.btn-editar');
  const bDel  = e.target.closest('.btn-eliminar');

  if (bEdit) {
    const tel = bEdit.dataset.tel;
    location.href = `../Vista/add_cliente.html?tel=${encodeURIComponent(tel)}`;
    return;
  }

  if (bDel) {
    const tel = bDel.dataset.tel;
    if (!confirm('¿Eliminar este cliente? Se eliminarán también sus mascotas.')) return;
    const { error } = await eliminarClientePorTelefono(tel);
    if (error) return alert('No se pudo eliminar: ' + error.message);
    await cargar(buscar.value.trim());
  }
});

buscar?.addEventListener('input', async () => {
  await cargar(buscar.value.trim());
});

btnMenu?.addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  const visible = getComputedStyle(sidebar).display !== 'none';
  sidebar.style.display = visible ? 'none' : 'flex';
});

// Init
document.addEventListener('DOMContentLoaded', () => cargar());
