// controlador/add_cliente.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);

// refs
const form      = $('#frmCliente');
const inpNom    = $('#nombre');
const inpPat    = $('#paterno');
const inpMat    = $('#materno');
const inpTel    = $('#telefono');
const inpEmail  = $('#email');
const telOrig   = $('#telOriginal');

// lee ?tel=...
function getTelFromQuery() {
  const p = new URLSearchParams(location.search);
  return p.get('tel');
}

// prefill si edición
async function prefillIfEdit() {
  const tel = getTelFromQuery();
  if (!tel) return;

  const { data, error } = await sb
    .from('clientes')
    .select('nombre, paterno, materno, telefono, email')
    .eq('telefono', tel)
    .single();

  if (error) {
    alert('No se pudo cargar el cliente: ' + error.message);
    return;
  }

  telOrig.value   = data.telefono; // para buscar en UPDATE
  inpNom.value    = data.nombre ?? '';
  inpPat.value    = data.paterno ?? '';
  inpMat.value    = data.materno ?? '';
  inpTel.value    = data.telefono ?? '';
  inpEmail.value  = data.email ?? '';
}

// guardar
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    nombre:   inpNom.value.trim(),
    paterno:  inpPat.value.trim(),
    materno:  inpMat.value.trim(),
    telefono: inpTel.value.trim(),
    email:    inpEmail.value.trim(),
  };

  if (!payload.nombre || !payload.telefono || !payload.email) {
    alert('Completa nombre, teléfono y email.');
    return;
  }

  let error;

  if (telOrig.value) {
    // edición: si cambiaron el teléfono, actualiza también las mascotas para mantener la FK
    if (telOrig.value !== payload.telefono) {
      const { error: eM } = await sb
        .from('mascotas')
        .update({ cli_tel: payload.telefono })
        .eq('cli_tel', telOrig.value);
      if (eM) return alert('No se pudo actualizar mascotas del cliente: ' + eM.message);
    }

    ({ error } = await sb
      .from('clientes')
      .update(payload)
      .eq('telefono', telOrig.value));
  } else {
    ({ error } = await sb.from('clientes').insert(payload));
  }

  if (error) return alert('No se pudo guardar: ' + error.message);

  alert('Cliente guardado');
  location.href = '../Vista/clientes.html';
});

// init
document.addEventListener('DOMContentLoaded', prefillIfEdit);
