import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sacc5i_db'
};

async function limpiarMotivoRechazoAprobados() {
  let connection;
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida\n');

    console.log('📋 Consultando registros con "Aprobado" en motivo_rechazo...');
    const [registros] = await connection.query(
      `SELECT id, nombre, apellido_paterno, motivo_rechazo, observaciones_c3, validado, rechazado 
       FROM personas_tramite_alta 
       WHERE motivo_rechazo = 'Aprobado' AND rechazado = FALSE`
    );

    console.log(`\n🔍 Encontrados ${registros.length} registros con el problema:\n`);
    registros.forEach(r => {
      console.log(`   ID ${r.id}: ${r.nombre} ${r.apellido_paterno}`);
      console.log(`      motivo_rechazo: "${r.motivo_rechazo}" → NULL`);
      console.log(`      observaciones_c3: ${r.observaciones_c3 || 'NULL'}\n`);
    });

    if (registros.length > 0) {
      console.log('🔧 Aplicando corrección...');
      const [result] = await connection.query(
        `UPDATE personas_tramite_alta 
         SET motivo_rechazo = NULL 
         WHERE motivo_rechazo = 'Aprobado' AND rechazado = FALSE`
      );

      console.log(`✅ ${result.affectedRows} registros actualizados\n`);
    } else {
      console.log('✅ No hay registros que corregir\n');
    }

    // También limpiar casos donde motivo_rechazo tiene texto pero la persona NO está rechazada y SÍ tiene propuesta
    console.log('📋 Buscando personas con propuesta pero motivo_rechazo lleno (debería estar en observaciones)...');
    const [registros2] = await connection.query(
      `SELECT id, nombre, apellido_paterno, motivo_rechazo, observaciones_c3, tiene_propuesta_cambio, rechazado 
       FROM personas_tramite_alta 
       WHERE motivo_rechazo IS NOT NULL 
         AND rechazado = FALSE 
         AND tiene_propuesta_cambio = TRUE`
    );

    if (registros2.length > 0) {
      console.log(`\n🔍 Encontrados ${registros2.length} registros con propuesta y motivo_rechazo incorrecto:\n`);
      registros2.forEach(r => {
        console.log(`   ID ${r.id}: ${r.nombre} ${r.apellido_paterno}`);
        console.log(`      motivo_rechazo: "${r.motivo_rechazo}" (debería estar en observaciones_c3)`);
        console.log(`      observaciones_c3: ${r.observaciones_c3 || 'NULL'}\n`);
      });

      console.log('⚠️  NOTA: Estos registros requieren revisión manual.');
      console.log('   El texto en motivo_rechazo debería moverse a observaciones_c3.\n');
    }

    console.log('✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar migración
limpiarMotivoRechazoAprobados();
