import pool from './database.js';

async function fixUsuariosTable() {
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Corrigiendo estructura de tabla usuarios...\n');

    // Verificar si existe la columna nombre_completo
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM usuarios WHERE Field = 'nombre_completo'`
    );

    if (columns.length > 0) {
      console.log('📋 Dividiendo nombre_completo en nombre y apellido...');
      
      // Agregar columnas nombre y apellido si no existen
      try {
        await connection.query('ALTER TABLE usuarios ADD COLUMN nombre VARCHAR(100) AFTER id');
        console.log('✅ Columna nombre agregada');
      } catch (e) {
        console.log('⚠️  Columna nombre ya existe');
      }

      try {
        await connection.query('ALTER TABLE usuarios ADD COLUMN apellido VARCHAR(100) AFTER nombre');
        console.log('✅ Columna apellido agregada');
      } catch (e) {
        console.log('⚠️  Columna apellido ya existe');
      }

      // Migrar datos de nombre_completo a nombre y apellido
      const [usuarios] = await connection.query('SELECT id, nombre_completo FROM usuarios');
      
      for (const usuario of usuarios) {
        if (usuario.nombre_completo) {
          const partes = usuario.nombre_completo.trim().split(' ');
          const nombre = partes[0];
          const apellido = partes.slice(1).join(' ') || '';
          
          await connection.query(
            'UPDATE usuarios SET nombre = ?, apellido = ? WHERE id = ?',
            [nombre, apellido, usuario.id]
          );
        }
      }
      console.log(`✅ ${usuarios.length} usuarios migrados`);

      // Eliminar columna nombre_completo
      await connection.query('ALTER TABLE usuarios DROP COLUMN nombre_completo');
      console.log('✅ Columna nombre_completo eliminada');
    } else {
      console.log('✅ La tabla ya tiene la estructura correcta (nombre/apellido)');
    }

    console.log('\n✅ Estructura de tabla usuarios corregida\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// Ejecutar
fixUsuariosTable()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
