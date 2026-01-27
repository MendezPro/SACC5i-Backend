import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function limpiarTramites() {
  let connection;
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sacc5i_db'
    });
    console.log('✅ Conexión establecida\n');

    console.log('🗑️  Limpiando tablas de trámites...\n');

    // Desactivar checks de foreign keys temporalmente
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Limpiar historial primero
    console.log('  📋 Limpiando historial_tramites_alta...');
    const [historial] = await connection.query('DELETE FROM historial_tramites_alta');
    console.log(`     ✅ ${historial.affectedRows} registros eliminados`);

    // Limpiar personas
    console.log('  👥 Limpiando personas_tramite_alta...');
    const [personas] = await connection.query('DELETE FROM personas_tramite_alta');
    console.log(`     ✅ ${personas.affectedRows} registros eliminados`);

    // Limpiar trámites
    console.log('  📄 Limpiando tramites_alta...');
    const [tramites] = await connection.query('DELETE FROM tramites_alta');
    console.log(`     ✅ ${tramites.affectedRows} registros eliminados`);

    // Reiniciar auto_increment
    console.log('\n🔄 Reiniciando contadores AUTO_INCREMENT...');
    await connection.query('ALTER TABLE historial_tramites_alta AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE personas_tramite_alta AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE tramites_alta AUTO_INCREMENT = 1');
    console.log('   ✅ Contadores reiniciados');

    // Reactivar foreign keys
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✅ Limpieza completada exitosamente!');
    console.log('\n📊 Estado actual:');
    console.log('   - tramites_alta: 0 registros');
    console.log('   - personas_tramite_alta: 0 registros');
    console.log('   - historial_tramites_alta: 0 registros');
    console.log('\n💾 Catálogos preservados:');
    console.log('   ✅ Usuarios');
    console.log('   ✅ Puestos');
    console.log('   ✅ Municipios');
    console.log('   ✅ Dependencias');
    console.log('   ✅ Regiones');
    console.log('   ✅ Tipos de oficio');
    console.log('   ✅ Estatus');

    console.log('\n🚀 Listo para crear nuevos trámites de prueba');

  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada\n');
    }
  }
}

// Ejecutar limpieza
limpiarTramites();
