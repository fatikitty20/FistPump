// controlador/add_mascotas.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);

// refs del formulario
const form    = $('#frmMascota');
const inpId   = $('#id');
const inpNom  = $('#nombre');
const inpEdad = $('#edad');
const selEsp  = $('#especie');
const selRaza = $('#raza');
const inpTel  = $('#duenio_tel');
const txtObs  = $('#observaciones');
const inpFoto = $('#foto');
const imgPrev = $('#prevFoto');

let RAZAS = [];
let OBS_FIELD = 'observaciones';

// util especie
function specieLabel(r) {
  if (!r) return '';
  if (r.especie) return String(r.especie);
  if (r.especie_id != null) return ({1: 'Perro', 2: 'Gato'})[r.especie_id] ?? '';
  return '';
}

// llenar razas
function fillRazas() {
  const filtro = (selEsp.value || '').toLowerCase();
  selRaza.innerHTML = '';
  selRaza.appendChild(new Option('Selecciona raza', ''));

  const mapIdToName = { 1: 'perro', 2: 'gato' };
  const lista = RAZAS.filter(r => {
    if (!filtro) return true;
    const espTxt = (r.especie || '').toLowerCase();
    const espIdTxt = mapIdToName[r.especie_id] || '';
    return espTxt === filtro || espIdTxt === filtro;
  });

  for (const r of lista) {
    selRaza.appendChild(new Option(r.nombre ?? `#${r.id}`, r.id));
  }
  selRaza.disabled = selRaza.options.length <= 1;
}

async function detectObsField() {
  let r = await sb.from('mascotas').select('id,observaciones').limit(1);
  if (!r.error) { OBS_FIELD = 'observaciones'; return; }
  r = await sb.from('mascotas').select('id,observacionesM').limit(1);
  if (!r.error) { OBS_FIELD = 'observacionesM'; return; }
  OBS_FIELD = 'observacionesM'; // por defecto, evita pedir una que no existe
}


// cargar razas
async function loadRazas() {
  let res = await sb.from('Razas').select('id, nombre, especie, especie_id').order('id');
  if (res.error) res = await sb.from('razas').select('id, nombre, especie, especie_id').order('id');
  if (res.error) { alert('No se pudieron cargar razas'); RAZAS = []; return; }
  RAZAS = res.data || [];
}

// vista previa de imagen
inpFoto?.addEventListener('change', () => {
  const f = inpFoto.files?.[0];
  if (!f) { imgPrev.style.display = 'none'; imgPrev.src = ''; return; }
  const url = URL.createObjectURL(f);
  imgPrev.src = url;
  imgPrev.style.display = 'block';
});

async function tryPrefillFromQuery() {
  const qsId = new URLSearchParams(location.search).get('id');
  if (!qsId) return;

  const idNum = Number(qsId);
  const filter = Number.isFinite(idNum) ? idNum : qsId;

  const cols = `id,nombre,edad,cli_tel,raza_id,foto_url,${OBS_FIELD}`;
  const { data, error } = await sb
    .from('mascotas')
    .select(cols)
    .eq('id', filter)
    .maybeSingle();

  if (error) {
    console.error('Error cargando mascota:', error);
    alert('No se pudo cargar la mascota: ' + (error.message || ''));
    return;
  }
  if (!data) {
    alert(`No existe la mascota con id=${qsId}`);
    return;
  }

  inpId.value   = data.id ?? '';
  inpNom.value  = data.nombre ?? '';
  inpEdad.value = data.edad ?? '';
  inpTel.value  = data.cli_tel ?? '';
  txtObs.value  = data[OBS_FIELD] ?? '';

  const r = RAZAS.find(x => String(x.id) === String(data.raza_id));
  if (r) selEsp.value = (r.especie ?? ({1:'Perro',2:'Gato'})[r.especie_id]) || '';
  fillRazas();
  if (data.raza_id != null) selRaza.value = String(data.raza_id);

  if (data.foto_url) {
    imgPrev.src = data.foto_url;
    imgPrev.style.display = 'block';
  }
}


// SUBIR FOTO: devuelve publicUrl o null
async function uploadPhotoIfAny(existingUrl = '') {
  const file = inpFoto.files?.[0];
  if (!file) return existingUrl || null;

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `mascotas/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await sb.storage.from('mascotas').upload(path, file, { cacheControl: '3600', upsert: false });
  if (upErr) { alert('No se pudo subir la foto: ' + upErr.message); return existingUrl || null; }

  const { data } = sb.storage.from('mascotas').getPublicUrl(path);
  return data?.publicUrl ?? existingUrl ?? null;
}

// eventos
selEsp.addEventListener('change', fillRazas);

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // sube foto primero
  const currentUrl = imgPrev?.src?.startsWith('blob:') ? '' : (imgPrev?.src || '');
  const fotoUrl = await uploadPhotoIfAny(currentUrl);

  const payload = {
    nombre:  inpNom.value.trim(),
    edad:    Number(inpEdad.value),
    cli_tel: inpTel.value.trim(),
    raza_id: Number(selRaza.value || 0),
    foto_url: fotoUrl
  };
  payload[OBS_FIELD] = txtObs.value.trim();

  if (!payload.nombre || !Number.isFinite(payload.edad) || !payload.cli_tel || !payload.raza_id) {
    return alert('Completa nombre, edad, teléfono y raza.');
  }

  let error;
  if (inpId.value) {
    ({ error } = await sb.from('mascotas').update(payload).eq('id', Number(inpId.value)));
  } else {
    ({ error } = await sb.from('mascotas').insert(payload));
  }

  if (error) return alert('No se pudo guardar: ' + error.message);
  alert('Mascota guardada');
  location.href = 'mascotas.html';
});

document.addEventListener('DOMContentLoaded', async () => {
  await detectObsField();     // <-- primero
  await loadRazas();
  fillRazas();
  await tryPrefillFromQuery(); // <-- ya conoce OBS_FIELD
});
