/**
 * MIGRACIÓN: Agregar campo observaciones_c3 a personas_tramite_alta
 * 
 * Fecha: 2026-01-26
 * Propósito: Separar las observaciones de C3 del campo motivo_rechazo
 *           - motivo_rechazo: Solo para rechazos
 *           - observaciones_c3: Para comentarios generales (propuestas, aprobaciones, etc.)
 * 
 * EJECUTAR MANUALMENTE:
 * node src/config/migrations/agregar_observaciones_c3.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sacc5i_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function ejecutarMigracion() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Iniciando migración: Agregar observaciones_c3...\n');

    // 1. Verificar si el campo ya existe
    const [campos] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'personas_tramite_alta' 
        AND COLUMN_NAME = 'observaciones_c3'
    `, [process.env.DB_NAME || 'sacc5i_db']);

    if (campos.length > 0) {
      console.log('⚠️  El campo observaciones_c3 ya existe.');
      console.log('✅ Migración completada (sin cambios necesarios).\n');
      return;
    }

    // 2. Agregar campo observaciones_c3
    console.log('📝 Agregando campo observaciones_c3 a personas_tramite_alta...');
    
    await connection.query(`
      ALTER TABLE personas_tramite_alta
      ADD COLUMN observaciones_c3 TEXT NULL COMMENT 'Observaciones generales de C3 (propuestas, comentarios, etc.)'
      AFTER motivo_rechazo
    `);

    console.log('✅ Campo observaciones_c3 agregado correctamente\n');

    // 3. Migrar datos existentes: mover observaciones de motivo_rechazo cuando NO está rechazado
    console.log('📦 Migrando datos existentes...');
    
    await connection.query(`
      UPDATE personas_tramite_alta
      SET observaciones_c3 = motivo_rechazo,
          motivo_rechazo = NULL
      WHERE rechazado = FALSE 
        AND motivo_rechazo IS NOT NULL
        AND motivo_rechazo != ''
        AND motivo_rechazo != 'Aprobado'
    `);

    console.log('✅ Datos migrados correctamente\n');

    // 4. Resumen
    const [total] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN observaciones_c3 IS NOT NULL THEN 1 ELSE 0 END) as con_observaciones,
        SUM(CASE WHEN motivo_rechazo IS NOT NULL THEN 1 ELSE 0 END) as con_rechazo
      FROM personas_tramite_alta
    `);

    console.log('📊 Resumen de la tabla personas_tramite_alta:');
    console.log(`   - Total de personas: ${total[0].total}`);
    console.log(`   - Con observaciones_c3: ${total[0].con_observaciones}`);
    console.log(`   - Con motivo_rechazo: ${total[0].con_rechazo}\n`);

    console.log('✅ Migración completada exitosamente\n');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

// Ejecutar migración
ejecutarMigracion()
  .then(() => {
    console.log('🎉 Proceso de migración finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
