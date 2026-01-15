import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dropTables = async () => {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sacc5i_db'
    });

    console.log('🗑️  Eliminando tablas antiguas...\n');

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const tables = [
      'historial_solicitudes',
      'solicitudes',
      'usuarios',
      'municipios',
      'regiones',
      'tipos_oficio',
      'estatus_solicitudes'
    ];

    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS ${table}`);
      console.log(`✅ Tabla ${table} eliminada`);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n🎉 Todas las tablas eliminadas correctamente\n');

  } catch (error) {
    console.error('❌ Error al eliminar tablas:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

dropTables()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
