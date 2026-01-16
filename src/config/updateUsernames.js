import pool from './database.js';
import bcrypt from 'bcryptjs';

async function updateUsernames() {
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Actualizando usernames a formato con guiones bajos...\n');

    // Mapeo de usuarios antiguos a nuevos
    const updates = [
      { old: 'orlando.dev', new: 'orla_developer', password: 'Orlando2026!', rol: 'super_admin' },
      { old: 'dev.sistema', new: 'dev_sistema', password: 'DevSistema2026!', rol: 'super_admin' },
      { old: 'leslie.c5', new: 'leslie_admin', password: '10000', rol: 'admin' },
      { old: 'belen.rodriguez', new: 'belen_rodriguez', password: '11020', rol: 'analista' },
      { old: 'maria.palacios', new: 'maria_palacios', password: '17025', rol: 'analista' },
      { old: 'elsa.castillo', new: 'elsa_castillo', password: '41025', rol: 'analista' },
      { old: 'jose.vazquez', new: 'jose_vazquez', password: '10029', rol: 'analista' },
      { old: 'guadalupe.serrano', new: 'guadalupe_serrano', password: '43025', rol: 'analista' },
      { old: 'jaime.fernandez', new: 'jaime_fernandez', password: '12025', rol: 'analista' },
      { old: 'alejandro.dominguez', new: 'alejandro_dominguez', password: '42025', rol: 'analista' },
      { old: 'analista.huejotzingo', new: 'analista_huejotzingo', password: '10027', rol: 'analista' },
      { old: 'analista.palmar', new: 'analista_palmar', password: '00000', rol: 'analista' }
    ];

    for (const update of updates) {
      // Verificar si el usuario existe
      const [existing] = await connection.query(
        'SELECT id FROM usuarios WHERE usuario = ?',
        [update.old]
      );

      if (existing.length > 0) {
        // Actualizar username
        await connection.query(
          'UPDATE usuarios SET usuario = ? WHERE usuario = ?',
          [update.new, update.old]
        );
        console.log(`✅ ${update.old} → ${update.new}`);
      } else {
        console.log(`⚠️  Usuario ${update.old} no encontrado`);
      }
    }

    console.log('\n✅ Usernames actualizados correctamente\n');

  } catch (error) {
    console.error('❌ Error al actualizar usernames:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Ejecutar
updateUsernames()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
