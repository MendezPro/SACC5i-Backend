/**
 * Script de prueba para endpoints de administración
 * Uso: node test-admin.js
 */

const BASE_URL = 'http://localhost:5000/api';

// Colores para consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

let adminToken = '';

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken && { 'Authorization': `Bearer ${adminToken}` }),
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test() {
  console.log('\n' + '='.repeat(60));
  log('🧪 TEST DE ENDPOINTS DE ADMINISTRACIÓN - SACC5i', 'blue');
  console.log('='.repeat(60) + '\n');

  // 1. Login como Super Admin
  log('\n1️⃣ Login como Super Admin (orlando.dev)', 'yellow');
  const loginResponse = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'orlando.dev',
      password: 'Orlando2026!'
    })
  });

  if (loginResponse.status === 200) {
    adminToken = loginResponse.data.token;
    log('✅ Login exitoso', 'green');
    log(`   Usuario: ${loginResponse.data.usuario.nombre} ${loginResponse.data.usuario.apellido}`, 'green');
    log(`   Rol: ${loginResponse.data.usuario.rol}`, 'green');
    
    if (!loginResponse.data.usuario.password_changed) {
      log('   ⚠️ Advertencia: Debe cambiar su contraseña', 'yellow');
    }
  } else {
    log('❌ Error en login', 'red');
    log(`   ${JSON.stringify(loginResponse.data)}`, 'red');
    return;
  }

  // 2. Obtener lista de usuarios
  log('\n2️⃣ Obtener todos los usuarios', 'yellow');
  const usuariosResponse = await request('/admin/usuarios');
  
  if (usuariosResponse.status === 200) {
    log('✅ Lista obtenida exitosamente', 'green');
    log(`   Total usuarios: ${usuariosResponse.data.usuarios.length}`, 'green');
    
    const porRol = usuariosResponse.data.usuarios.reduce((acc, u) => {
      acc[u.rol] = (acc[u.rol] || 0) + 1;
      return acc;
    }, {});
    
    log(`   Por rol: ${JSON.stringify(porRol)}`, 'green');
  } else {
    log('❌ Error al obtener usuarios', 'red');
  }

  // 3. Filtrar solo analistas
  log('\n3️⃣ Filtrar solo analistas', 'yellow');
  const analistasResponse = await request('/admin/usuarios?rol=analista');
  
  if (analistasResponse.status === 200) {
    log('✅ Analistas obtenidos', 'green');
    log(`   Total analistas: ${analistasResponse.data.usuarios.length}`, 'green');
  } else {
    log('❌ Error al filtrar analistas', 'red');
  }

  // 4. Crear nuevo usuario
  log('\n4️⃣ Crear nuevo usuario de prueba', 'yellow');
  const createResponse = await request('/admin/usuarios', {
    method: 'POST',
    body: JSON.stringify({
      username: 'test.usuario',
      nombre: 'Test',
      apellido: 'Usuario',
      extension: '99999',
      rol: 'analista',
      region_id: 1
    })
  });

  let nuevoUsuarioId = null;
  if (createResponse.status === 201) {
    nuevoUsuarioId = createResponse.data.usuarioId;
    log('✅ Usuario creado exitosamente', 'green');
    log(`   ID: ${nuevoUsuarioId}`, 'green');
    log(`   Username: test.usuario`, 'green');
    log(`   Password inicial: 99999 (extensión)`, 'green');
  } else {
    log('❌ Error al crear usuario', 'red');
    log(`   ${JSON.stringify(createResponse.data)}`, 'red');
  }

  // 5. Actualizar usuario
  if (nuevoUsuarioId) {
    log('\n5️⃣ Actualizar usuario creado', 'yellow');
    const updateResponse = await request(`/admin/usuarios/${nuevoUsuarioId}`, {
      method: 'PUT',
      body: JSON.stringify({
        extension: '88888',
        region_id: 2
      })
    });

    if (updateResponse.status === 200) {
      log('✅ Usuario actualizado', 'green');
      log(`   Nueva extensión: 88888`, 'green');
      log(`   Nueva región: 2`, 'green');
    } else {
      log('❌ Error al actualizar usuario', 'red');
    }
  }

  // 6. Resetear contraseña
  if (nuevoUsuarioId) {
    log('\n6️⃣ Resetear contraseña del usuario', 'yellow');
    const resetResponse = await request(`/admin/usuarios/${nuevoUsuarioId}/reset-password`, {
      method: 'PATCH'
    });

    if (resetResponse.status === 200) {
      log('✅ Contraseña reseteada', 'green');
      log(`   Nueva contraseña: 88888 (extensión)`, 'green');
    } else {
      log('❌ Error al resetear contraseña', 'red');
    }
  }

  // 7. Desactivar usuario
  if (nuevoUsuarioId) {
    log('\n7️⃣ Desactivar usuario', 'yellow');
    const deactivateResponse = await request(`/admin/usuarios/${nuevoUsuarioId}/deactivate`, {
      method: 'PATCH'
    });

    if (deactivateResponse.status === 200) {
      log('✅ Usuario desactivado', 'green');
    } else {
      log('❌ Error al desactivar usuario', 'red');
    }
  }

  // 8. Activar usuario
  if (nuevoUsuarioId) {
    log('\n8️⃣ Reactivar usuario', 'yellow');
    const activateResponse = await request(`/admin/usuarios/${nuevoUsuarioId}/activate`, {
      method: 'PATCH'
    });

    if (activateResponse.status === 200) {
      log('✅ Usuario reactivado', 'green');
    } else {
      log('❌ Error al reactivar usuario', 'red');
    }
  }

  // 9. Obtener estadísticas
  log('\n9️⃣ Obtener estadísticas del sistema', 'yellow');
  const statsResponse = await request('/admin/estadisticas');
  
  if (statsResponse.status === 200) {
    log('✅ Estadísticas obtenidas', 'green');
    console.log(JSON.stringify(statsResponse.data, null, 2));
  } else {
    log('❌ Error al obtener estadísticas', 'red');
  }

  // 10. Intentar desactivar Super Admin (debe fallar)
  log('\n🔟 Intentar desactivar Super Admin (debe fallar)', 'yellow');
  const deactivateSuperResponse = await request('/admin/usuarios/1/deactivate', {
    method: 'PATCH'
  });

  if (deactivateSuperResponse.status === 400) {
    log('✅ Protección correcta: No se puede desactivar Super Admin', 'green');
  } else {
    log('⚠️ ADVERTENCIA: Se permitió desactivar Super Admin', 'red');
  }

  // 11. Login como analista (verificar que password no cambió)
  log('\n1️⃣1️⃣ Login como analista con contraseña inicial', 'yellow');
  const analistaLoginResponse = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'belen.rodriguez',
      password: '11020'
    })
  });

  if (analistaLoginResponse.status === 200) {
    log('✅ Login exitoso', 'green');
    log(`   Usuario: ${analistaLoginResponse.data.usuario.nombre} ${analistaLoginResponse.data.usuario.apellido}`, 'green');
    log(`   Extensión: ${analistaLoginResponse.data.usuario.extension}`, 'green');
    
    if (!analistaLoginResponse.data.usuario.password_changed) {
      log('   ⚠️ ADVERTENCIA: DEBE CAMBIAR SU CONTRASEÑA', 'yellow');
      log(`   Mensaje: ${analistaLoginResponse.data.warning}`, 'yellow');
    }
  } else {
    log('❌ Error en login', 'red');
  }

  console.log('\n' + '='.repeat(60));
  log('✅ PRUEBAS COMPLETADAS', 'blue');
  console.log('='.repeat(60) + '\n');
}

test();
