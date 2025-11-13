// controlador/api.js
let supabaseClient = null;

async function ensureSupabase() {
  if (supabaseClient) return supabaseClient;
  const mod = await import('https://esm.sh/@supabase/supabase-js');
  const { createClient } = mod;
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Falta SUPABASE_URL o SUPABASE_ANON_KEY');

  supabaseClient = createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'x-application-name': 'veterinari-frontend' } }
  });
  return supabaseClient;
}

// Ajusta aquí tu PK real por tabla
const PK_BY_TABLE = {
  clientes: 'telefono',   // <-- cámbialo a 'id' o 'idCliente' si esa es tu PK
  mascotas: 'id',
  servicios: 'id',
};

export async function apiFetch(path, options = {}) {
  const sb = await ensureSupabase();
  const method = (options.method || 'GET').toUpperCase();
  const [ , table, action, idOrKeyRaw ] = String(path).split('/');
  const idOrKey = idOrKeyRaw ? decodeURIComponent(idOrKeyRaw) : null;

  async function handle(res, err) {
    if (err) throw new Error(err.message);
    return res;
  }

  if (!table || !action) throw new Error('Ruta API inválida: ' + path);

  if (method === 'GET' && action === 'list') {
    // Sin order para no romper si no existe 'id'
    const { data, error } = await sb.from(table).select('*').limit(500);
    return handle(data, error);
  }

  if (method === 'POST' && action === 'create') {
    const body = typeof options.body === 'string' ? JSON.parse(options.body || '{}') : (options.body || {});
    // Coerciones leves
    if (table === 'mascotas') {
      if (body.edad != null) body.edad = Number(body.edad);
      if (body.raza_id != null) body.raza_id = Number(body.raza_id);
    }
    if (table === 'servicios') {
      if (body.costo != null) body.costo = Number(body.costo);
      if (body.duracion != null) body.duracion = Number(body.duracion);
    }
    const { data, error } = await sb.from(table).insert([ body ]).select('*').single();
    return handle(data, error);
  }

  if (method === 'DELETE' && action === 'delete' && idOrKey) {
    const pk = PK_BY_TABLE[table] || 'id';
    let query = sb.from(table).delete().eq(pk, pk === 'id' ? Number(idOrKey) : idOrKey);
    const { data, error } = await query.select('*');
    return handle(data, error);
  }

  throw new Error(`Ruta o método no soportado: ${method} ${path}`);
}

export default null;
