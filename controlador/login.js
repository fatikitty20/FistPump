 import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
    const supabase = createClient('https://qsaowtibdsouszwyupvl.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzYW93dGliZHNvdXN6d3l1cHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDE1NDYsImV4cCI6MjA3Nzc3NzU0Nn0.xtW53Uh4qq6XeEUoz6_eiAJN-NbRAL82rJA15FRydk8');

    async function cargarRoles() {
      const { data, error } = await supabase.from('roles').select('*');
      const select = document.getElementById('rol_id');
      select.innerHTML = '<option value="">Seleccione el rol</option>';
      if (error) return alert('Error al cargar roles');

      data.forEach(r => {
        const option = document.createElement('option');
        option.value = r.id;
        option.textContent = r.nombre;
        select.appendChild(option);
      });
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const user = document.getElementById('user').value.trim();
      const pass = document.getElementById('pass').value.trim();
      const rol_id = +document.getElementById('rol_id').value;
      const errorMsg = document.getElementById('errorMsg');

      if (!user || !pass || !rol_id) {
        errorMsg.textContent = 'Todos los campos son obligatorios';
        return;
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('*, roles(nombre)')
        .eq('user', user)
        .eq('pass', pass)
        .eq('rol_id', rol_id)
        .single();

      if (error || !data) {
        errorMsg.textContent = 'Credenciales incorrectas o rol no válido';
        return;
      }

      // Redirección según el nombre del rol
      const rolNombre = data.roles?.nombre;
      if (rolNombre === 'Administrador') {
        location.href = 'admin/index.html';
      } else if (rolNombre === 'Recepcionista') {
        location.href = 'recepcion/index.html';
      } else {
        location.href = 'index.html';
      }
    });

    cargarRoles();