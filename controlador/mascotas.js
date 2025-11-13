// controlador/mascotas.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// Helpers
const $ = (s) => document.querySelector(s);
const tbody   = $('#tablaMascotas tbody');
const btnMenu = document.querySelector('.menu-toggle');
const inpBuscar = $('#q'); // <input id="q"> en mascotas.html

let RAZAS = [];             // catálogo de razas
let OBS_FIELD = 'observaciones';

// Mapea especie_id -> etiqueta si tu tabla Razas no trae el texto
const especieIdToText = (id) => ({ 1: 'Perro', 2: 'Gato' })[Number(id)] ?? '';

// Limpia teléfono para búsquedas
const cleanPhone = (s) => (s || '').replace(/[^\d+]/g, '');

// ---------- Detecta el nombre real del campo observaciones ----------
async function detectObsField() {
  let r = await sb.from('mascotas').select('id,observaciones').limit(1);
  if (!r.error) { OBS_FIELD = 'observaciones'; return; }
  r = await sb.from('mascotas').select('id,observacionesM').limit(1);
  if (!r.error) { OBS_FIELD = 'observacionesM'; return; }
  OBS_FIELD = 'observaciones';
}

// ---------- Carga Razas (acepta "Razas" o "razas") ----------
async function cargarRazas() {
  let res = await sb.from('Razas').select('id, nombre, especie, especie_id');
  if (res.error) res = await sb.from('razas').select('id, nombre, especie, especie_id');
  if (res.error) {
    console.error(res.error);
    alert('No se pudieron cargar las razas: ' + res.error.message);
    RAZAS = [];
    return;
  }
  RAZAS = res.data || [];
}

// ---------- Utilidades de render ----------
const razaById = (id) => RAZAS.find(r => String(r.id) === String(id));

const thumb = (src) =>
  src ? `<img src="${src}" alt="foto" style="width:48px;height:48px;object-fit:cover;border-radius:8px;">` : '';

function renderTabla(rows) {
  tbody.innerHTML = '';
  if (!rows?.length) {
    // OJO: si en tu THEAD tienes la columna "Foto", el colspan debe ser 6
    tbody.innerHTML = '<tr><td colspan="6">No hay mascotas registradas.</td></tr>';
    return;
  }

  for (const m of rows) {
    const r = razaById(m.raza_id);
    const especieTxt = (r?.especie) ?? especieIdToText(r?.especie_id);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${thumb(m.foto_url)}</td>
      <td>${m.nombre ?? ''}</td>
      <td>${especieTxt}</td>
      <td>${descripcion}</td>  
      <td>${r?.nombre ?? ''}</td>
      <td>${m.cli_tel ?? ''}</td>
      <td>
        <button class="btn-editar" data-id="${m.id}">
          <i class="fa-solid fa-pen-to-square"></i> Editar
        </button>
        <button class="btn-eliminar" data-id="${m.id}">
          <i class="fa-solid fa-trash"></i> Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}//descripcion falta darle el enlace para traerlo de la raza y especie ...........

// ---------- Listado completo ----------
async function cargarMascotas() {
  const { data, error } = await sb
    .from('mascotas')
    .select(`id, nombre, edad, cli_tel, raza_id,descripcion_especie, ${OBS_FIELD}, foto_url`)
    .order('id', { ascending: true });

  if (error) {
    console.error(error);
    alert('No se pudieron cargar las mascotas: ' + error.message);
    return;
  }
  renderTabla(data);
}

// ---------- Búsqueda por teléfono (usa el mismo render y trae foto_url) ----------
async function buscarPorTelefono(term) {
  const t = cleanPhone(term);
  if (!t) return cargarMascotas();

  const { data, error } = await sb
    .from('mascotas')
    .select(`id, nombre, edad, cli_tel, raza_id,descrpcion_especie, ${OBS_FIELD}, foto_url`)
    .ilike('cli_tel', `%${t}%`)
    .order('id', { ascending: true })
    .limit(500);

  if (error) {
    console.error(error);
    alert('No se pudo buscar: ' + error.message);
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6">Sin resultados.</td></tr>';
    return;
  }
  renderTabla(data);
}

// ---------- Acciones Editar / Eliminar ----------
tbody.addEventListener('click', async (e) => {
  const bEdit = e.target.closest('.btn-editar');
  const bDel  = e.target.closest('.btn-eliminar');

  if (bEdit) {
    const id = bEdit.dataset.id;
location.href = `add_mascota.html?id=${id}`;
    return;
  }

  if (bDel) {
    const id = Number(bDel.dataset.id);
    if (!confirm('¿Eliminar esta mascota?')) return;
    const { error } = await sb.from('mascotas').delete().eq('id', id);
    if (error) return alert('No se pudo eliminar: ' + error.message);
    await cargarMascotas();
  }
});

// ---------- Toggle del menú lateral ----------
btnMenu?.addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  const visible = getComputedStyle(sidebar).display !== 'none';
  sidebar.style.display = visible ? 'none' : 'flex';
});

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', async () => {
  await detectObsField();
  await cargarRazas();
  await cargarMascotas();
});

// ---------- Debounce del buscador ----------
let searchTimer = null;
inpBuscar?.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => buscarPorTelefono(inpBuscar.value), 250);
});
