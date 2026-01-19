import pool from './src/config/database.js';

async function fixDuplicate() {
  const connection = await pool.getConnection();
  
  try {
    // Verificar el usuario ID 4 (debería ser belen_rodriguez)
    const [user4] = await connection.query('SELECT * FROM usuarios WHERE id = 4');
    console.log('\n📋 Usuario ID 4 (debería ser Belén Rodríguez):');
    console.log(JSON.stringify(user4[0], null, 2));
    
    // Restaurar usuario 4 a sus datos correctos si está mal
    await connection.query(
      `UPDATE usuarios 
       SET nombre = 'Belén', 
           apellido = 'Rodríguez', 
           usuario = 'belen_rodriguez',
           extension = '11020',
           rol = 'analista',
           region_id = 1
       WHERE id = 4`
    );
    console.log('\n✅ Usuario ID 4 restaurado correctamente');
    
    // Eliminar duplicados (IDs 25+)
    await connection.query('DELETE FROM usuarios WHERE id >= 13');
    console.log('✅ Usuarios duplicados eliminados');
    
    // Mostrar usuarios finales
    const [usuarios] = await connection.query('SELECT id, nombre, apellido, usuario, extension FROM usuarios ORDER BY id');
    console.log('\n📋 Usuarios finales:');
    usuarios.forEach(u => {
      console.log(`   ${u.id}: ${u.nombre} ${u.apellido} - ${u.usuario} (ext: ${u.extension})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

fixDuplicate();
