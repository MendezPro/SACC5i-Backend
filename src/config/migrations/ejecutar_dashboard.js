import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'siges_backend',
  waitForConnections: true,
  connectionLimit: 10
});

async function ejecutarMigracion() {
  const connection = await pool.getConnection();
  
  try {
    console.log('📊 Ejecutando migración: Tabla Dashboard Municipios...');
    
    // Crear tabla
    await connection.query(`
      CREATE TABLE IF NOT EXISTS analista_municipios_dashboard (
        id INT PRIMARY KEY AUTO_INCREMENT,
        usuario_analista_id INT NOT NULL,
        municipio_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_analista_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (municipio_id) REFERENCES municipios(id) ON DELETE CASCADE,
        UNIQUE KEY unique_analista_municipio (usuario_analista_id, municipio_id)
      )
    `);
    
    console.log('✅ Tabla analista_municipios_dashboard creada');
    
    // Crear índices (sin IF NOT EXISTS, ejecutar solo si no existen)
    try {
      await connection.query(`
        CREATE INDEX idx_analista_dashboard 
        ON analista_municipios_dashboard(usuario_analista_id)
      `);
      console.log('✅ Índice idx_analista_dashboard creado');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Índice idx_analista_dashboard ya existe');
      } else {
        throw err;
      }
    }
    
    try {
      await connection.query(`
        CREATE INDEX idx_municipio_dashboard 
        ON analista_municipios_dashboard(municipio_id)
      `);
      console.log('✅ Índice idx_municipio_dashboard creado');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Índice idx_municipio_dashboard ya existe');
      } else {
        throw err;
      }
    }
    console.log('🎉 Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error al ejecutar migración:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

ejecutarMigracion();
