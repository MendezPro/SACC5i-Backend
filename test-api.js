// Script de prueba rápida de la API
// Ejecutar con: node test-api.js

const testAPI = async () => {
  const BASE_URL = 'http://localhost:5000/api';
  let token = '';

  console.log('🧪 Iniciando pruebas de la API SACC5i...\n');

  try {
    // 1. Verificar que el servidor está corriendo
    console.log('1️⃣  Verificando servidor...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Servidor funcionando:', healthData.message);
    console.log('');

    // 2. Registrar un usuario de prueba
    console.log('2️⃣  Registrando usuario de prueba...');
    const registerData = {
      nombre_completo: 'Usuario de Prueba',
      usuario: `test_${Date.now()}`,
      password: 'test123456',
      fecha_nacimiento: '1990-01-01',
      region: 'Región III - Centro',
      extension: '1234'
    };

    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });

    const registerResult = await registerResponse.json();
    
    if (registerResult.success) {
      token = registerResult.data.token;
      console.log('✅ Usuario registrado:', registerResult.data.usuario);
      console.log('🔑 Token obtenido');
    } else {
      console.log('❌ Error en registro:', registerResult.message);
      return;
    }
    console.log('');

    // 3. Obtener catálogos
    console.log('3️⃣  Obteniendo catálogos...');
    
    const tiposResponse = await fetch(`${BASE_URL}/catalogos/tipos-oficio`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tiposData = await tiposResponse.json();
    console.log(`✅ Tipos de oficio: ${tiposData.data.length} registros`);

    const municipiosResponse = await fetch(`${BASE_URL}/catalogos/municipios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const municipiosData = await municipiosResponse.json();
    console.log(`✅ Municipios: ${municipiosData.data.length} registros`);

    const regionesResponse = await fetch(`${BASE_URL}/catalogos/regiones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const regionesData = await regionesResponse.json();
    console.log(`✅ Regiones: ${regionesData.data.length} registros`);

    const estatusResponse = await fetch(`${BASE_URL}/catalogos/estatus`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const estatusData = await estatusResponse.json();
    console.log(`✅ Estatus: ${estatusData.data.length} registros`);
    console.log('');

    // 4. Crear una solicitud
    console.log('4️⃣  Creando solicitud de prueba...');
    const solicitudData = {
      tipo_oficio_id: tiposData.data[0].id,
      municipio_id: municipiosData.data[0].id,
      region: regionesData.data[0].nombre,
      proceso_movimiento: 'Prueba de sistema',
      termino: '30 días',
      dias_horas: '720 horas',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      observaciones: 'Solicitud creada por script de prueba'
    };

    const createResponse = await fetch(`${BASE_URL}/solicitudes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(solicitudData)
    });

    const createResult = await createResponse.json();
    
    if (createResult.success) {
      console.log('✅ Solicitud creada:', createResult.data.numero_solicitud);
      console.log('');

      // 5. Listar solicitudes
      console.log('5️⃣  Listando solicitudes...');
      const listResponse = await fetch(`${BASE_URL}/solicitudes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listResponse.json();
      console.log(`✅ Total de solicitudes: ${listData.total}`);
      console.log('');

      // 6. Obtener estadísticas
      console.log('6️⃣  Obteniendo estadísticas...');
      const statsResponse = await fetch(`${BASE_URL}/solicitudes/estadisticas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsResponse.json();
      console.log(`✅ Total de solicitudes: ${statsData.data.total}`);
      console.log('');

      console.log('🎉 ¡Todas las pruebas pasaron exitosamente!\n');
      console.log('📝 El sistema está funcionando correctamente.');
      console.log('🌐 Puedes acceder a la API en: http://localhost:5000');
      console.log('📖 Documentación completa en: http://localhost:5000\n');

    } else {
      console.log('❌ Error al crear solicitud:', createResult.message);
    }

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    console.log('\n💡 Asegúrate de que:');
    console.log('   1. El servidor está corriendo (npm run dev)');
    console.log('   2. MySQL está en ejecución');
    console.log('   3. La base de datos está inicializada (npm run db:init)\n');
  }
};

// Ejecutar pruebas
testAPI();
