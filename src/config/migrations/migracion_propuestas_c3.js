import pool from './database.js';

/**
 * Script de migración para agregar funcionalidad de propuestas C3
 * Ejecutar con: node src/config/migracion_propuestas_c3.js
 */

async function migrarPropuestasC3() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Iniciando migración de propuestas C3...\n');

    // 1. Modificar ENUM de fase_actual en tramites_alta
    console.log('📝 Paso 1: Agregando fase "revision_propuesta_c3" a tramites_alta...');
    await connection.query(`
      ALTER TABLE tramites_alta 
      MODIFY COLUMN fase_actual ENUM(
        'datos_solicitud',
        'validacion_personal',
        'enviado_c3',
        'validado_c3',
        'revision_propuesta_c3',
        'rechazado_no_corresponde',
        'rechazado',
        'finalizado'
      ) DEFAULT 'datos_solicitud'
    `);
    console.log('✅ Fase agregada correctamente\n');

    // 2. Agregar columna puesto_propuesto_c3_id
    console.log('📝 Paso 2: Agregando columna puesto_propuesto_c3_id...');
    await connection.query(`
      ALTER TABLE personas_tramite_alta 
      ADD COLUMN puesto_propuesto_c3_id INT NULL 
      COMMENT 'Puesto propuesto por C3 (opcional)' 
      AFTER puesto_id
    `);
    console.log('✅ Columna puesto_propuesto_c3_id agregada\n');

    // 3. Agregar foreign key para puesto_propuesto_c3_id
    console.log('📝 Paso 3: Agregando foreign key para puesto_propuesto_c3_id...');
    await connection.query(`
      ALTER TABLE personas_tramite_alta 
      ADD CONSTRAINT fk_puesto_propuesto_c3 
      FOREIGN KEY (puesto_propuesto_c3_id) 
      REFERENCES puestos(id) 
      ON DELETE RESTRICT
    `);
    console.log('✅ Foreign key agregada\n');

    // 4. Agregar columna tiene_propuesta_cambio
    console.log('📝 Paso 4: Agregando columna tiene_propuesta_cambio...');
    await connection.query(`
      ALTER TABLE personas_tramite_alta 
      ADD COLUMN tiene_propuesta_cambio BOOLEAN DEFAULT FALSE 
      COMMENT 'Indica si C3 propuso cambio' 
      AFTER puesto_propuesto_c3_id
    `);
    console.log('✅ Columna tiene_propuesta_cambio agregada\n');

    // 5. Agregar columna decision_final_c5
    console.log('📝 Paso 5: Agregando columna decision_final_c5...');
    await connection.query(`
      ALTER TABLE personas_tramite_alta 
      ADD COLUMN decision_final_c5 ENUM('original', 'propuesta', 'pendiente') 
      DEFAULT 'pendiente' 
      COMMENT 'Decisión de C5 sobre propuesta' 
      AFTER tiene_propuesta_cambio
    `);
    console.log('✅ Columna decision_final_c5 agregada\n');

    // 6. Agregar índice para tiene_propuesta_cambio
    console.log('📝 Paso 6: Agregando índice para tiene_propuesta_cambio...');
    await connection.query(`
      ALTER TABLE personas_tramite_alta 
      ADD INDEX idx_propuesta (tiene_propuesta_cambio)
    `);
    console.log('✅ Índice agregado\n');

    console.log('✅✅✅ MIGRACIÓN COMPLETADA EXITOSAMENTE ✅✅✅');
    console.log('\n📊 Resumen de cambios:');
    console.log('  - Nueva fase: revision_propuesta_c3');
    console.log('  - 3 nuevas columnas en personas_tramite_alta');
    console.log('  - 1 foreign key agregada');
    console.log('  - 1 índice agregado');
    console.log('\n🚀 Servidor listo para usar propuestas C3\n');

  } catch (error) {
    console.error('\n❌ ERROR EN LA MIGRACIÓN:');
    
    // Manejar errores comunes
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.error('⚠️  Las columnas ya existen. La migración ya fue aplicada anteriormente.');
      console.log('✅ Tu base de datos ya está actualizada.\n');
    } else if (error.code === 'ER_DUP_KEYNAME') {
      console.error('⚠️  Los índices o foreign keys ya existen.');
      console.log('✅ Tu base de datos ya está actualizada.\n');
    } else {
      console.error('Error:', error.message);
      console.error('\n💡 Solución alternativa:');
      console.error('   Ejecuta: npm run db:reset');
      console.error('   (Esto recreará todas las tablas pero PERDERÁS los datos actuales)\n');
    }
  } finally {
    connection.release();
    await pool.end();
  }
}

// Ejecutar migración
migrarPropuestasC3()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
