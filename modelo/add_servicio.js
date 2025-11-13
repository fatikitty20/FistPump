// controlador/add_servicio.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const form = $('#frmServicio');

function getIdFromQuery() {
  const p = new URLSearchParams(location.search);
  return p.get('id');
}

async function cargarParaEditar(id) {
  const { data, error } = await sb.from('servicios')
    .select('id, nombre, descripcion, costo, duracion')
    .eq('id', id)
    .single();
  if (error) {
    console.error(error);
    return alert('No se pudo cargar el servicio: ' + error.message);
  }
  $('#id').value = data.id;
  $('#nombre').value = data.nombre ?? '';
  $('#descripcion').value = data.descripcion ?? '';
  $('#costo').value = data.costo ?? '';
  $('#duracion').value = data.duracion ?? '';
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    nombre: $('#nombre').value.trim(),
    descripcion: $('#descripcion').value.trim(),
    costo: Number($('#costo').value),
    duracion: Number($('#duracion').value)
  };
  if (!payload.nombre || Number.isNaN(payload.costo) || Number.isNaN(payload.duracion)) {
    return alert('Completa nombre, costo y duración correctamente.');
  }

  const id = $('#id').value;
  let error;
  if (id) {
    ({ error } = await sb.from('servicios').update(payload).eq('id', Number(id)));
  } else {
    ({ error } = await sb.from('servicios').insert(payload));
  }
  if (error) {
    console.error(error);
    return alert('No se pudo guardar: ' + error.message);
  }
  alert('Servicio guardado');
  location.href = 'servicios.html';
});

document.addEventListener('DOMContentLoaded', () => {
  const id = getIdFromQuery();
  if (id) cargarParaEditar(Number(id));
});
