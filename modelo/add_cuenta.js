// controlador/add_cuenta.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
  alert('Falta configurar SUPABASE_URL / SUPABASE_ANON_KEY en config.js');
  throw new Error('Config Supabase faltante');
}
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// ---- helpers DOM
const $ = (s) => document.querySelector(s);
const form       = $('#frmCuenta');
const btnSubmit  = form?.querySelector('button[type="submit"]');
const inpId      = $('#id');          // id de "cuenta" cuando editas
const inpNom     = $('#nombre');
const inpTel     = $('#telefono');
const inpEmail   = $('#email');
const selRol     = $('#rol_id');
const inpPass    = $('#contrasena');  // opcional (columna en "cuenta")

let usuarioIdActual = null;

const qParam = (k) => new URLSearchParams(location.search).get(k);
const setSaving = (on) => { if (btnSubmit){ btnSubmit.disabled = on; btnSubmit.textContent = on ? 'Guardando…' : 'Guardar'; } };

// ---- carga de roles
async function cargarRoles() {
  const { data, error } = await sb.from('roles').select('id,nombre').order('id');
  if (error) { alert('Error al cargar roles: ' + error.message); selRol.innerHTML = '<option value="">(Error)</option>'; return; }
  selRol.innerHTML = '<option value="">Seleccione el rol</option>';
  for (const r of (data ?? [])) {
    const opt = document.createElement('option');
    opt.value = String(r.id);                 // <- como string
    opt.textContent = r.nombre;
    selRol.appendChild(opt);
  }
}

// ---- prefill si ?id=...
async function prefillSiEditas() {
  const cuentaId = qParam('id');
  if (!cuentaId) return;

  // leer cuenta
  const { data: cta, error: eCta } = await sb.from('cuenta').select('id,usuario_id,contraseña').eq('id', cuentaId).single();
  if (eCta) { alert('No se pudo leer la cuenta: ' + eCta.message); return; }

  usuarioIdActual = cta.usuario_id;
  inpId.value = cta.id;
  if (cta.contraseña) inpPass.value = cta.contraseña;

  // leer usuario
  const { data: u, error: eUsr } = await sb
    .from('usuarios')
    .select('id,nombre,telefono,correo,rol_id')
    .eq('id', usuarioIdActual)
    .single();

  if (eUsr) { alert('No se pudo leer el usuario: ' + eUsr.message); return; }

  inpNom.value   = u?.nombre   ?? '';
  inpTel.value   = u?.telefono ?? '';
  inpEmail.value = u?.correo   ?? '';
  selRol.value   = String(u?.rol_id ?? '');
}

// ---- submit
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // validación nativa
  if (!form.checkValidity()) { form.reportValidity(); return; }

  setSaving(true);
  try {
    const payloadUsuario = {
      nombre:   inpNom.value.trim(),
      telefono: inpTel.value.trim(),
      correo:   inpEmail.value.trim(),
      rol_id:   Number(selRol.value || 0),
    };

    if (inpId.value) {
      // ----- EDITAR -----
      const { error: eU } = await sb.from('usuarios').update(payloadUsuario).eq('id', usuarioIdActual);
      if (eU) { alert('No se pudo actualizar el usuario: ' + eU.message); return; }

      // contraseña opcional
      if (inpPass.value.trim()) {
        const { error: eC } = await sb.from('cuenta').update({ contraseña: inpPass.value.trim() }).eq('id', Number(inpId.value));
        if (eC) { alert('No se pudo actualizar la contraseña: ' + eC.message); return; }
      }

      alert('Cuenta actualizada');
      location.href = 'cuentas.html';
      return;
    }

    // ----- NUEVO -----
    // 1) crear usuario
    const { data: u, error: eInsU } = await sb.from('usuarios')
      .insert(payloadUsuario).select('id').single();
    if (eInsU || !u) { alert('No se pudo crear el usuario: ' + (eInsU?.message || 'desconocido')); return; }

    // 2) crear cuenta
    const insCuenta = { usuario_id: u.id };
    if (inpPass.value.trim()) insCuenta.contraseña = inpPass.value.trim();

    const { error: eInsC } = await sb.from('cuenta').insert(insCuenta);
    if (eInsC) {
      // rollback por seguridad
      await sb.from('usuarios').delete().eq('id', u.id);
      alert('No se pudo crear la cuenta: ' + eInsC.message);
      return;
    }

    alert('Cuenta creada');
    location.href = 'cuentas.html';
  } catch (err) {
    console.error(err);
    alert('Error inesperado: ' + (err?.message || err));
  } finally {
    setSaving(false);
  }
});

// ---- init
document.addEventListener('DOMContentLoaded', async () => {
  if (!form) return;
  await cargarRoles();
  await prefillSiEditas();
});
