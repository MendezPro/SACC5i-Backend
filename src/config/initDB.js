import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const initDatabase = async () => {
  let connection;
  
  try {
    // Conectar sin especificar la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('🔄 Inicializando base de datos SACC5i...\n');

    // Crear base de datos si no existe
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'sacc5i_db'}`);
    console.log('✅ Base de datos creada/verificada');

    // Usar la base de datos
    await connection.query(`USE ${process.env.DB_NAME || 'sacc5i_db'}`);

    // ============================================
    // TABLA: Regiones (Cajas Territoriales)
    // ============================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS regiones (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        total_municipios INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla regiones creada');

    // ============================================
    // TABLA: Municipios (Con clave oficial)
    // ============================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS municipios (
        id INT PRIMARY KEY AUTO_INCREMENT,
        clave INT NOT NULL UNIQUE COMMENT 'Clave oficial del municipio',
        nombre VARCHAR(100) NOT NULL,
        region_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (region_id) REFERENCES regiones(id) ON DELETE CASCADE,
        INDEX idx_clave (clave),
        INDEX idx_region (region_id)
      )
    `);
    console.log('✅ Tabla municipios creada');

    // ============================================
    // TABLA: Tipos de Oficio
    // ============================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tipos_oficio (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla tipos_oficio creada');

    // ============================================
    // TABLA: Estatus de Solicitudes
    // ============================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS estatus_solicitudes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        descripcion VARCHAR(255),
        color VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla estatus_solicitudes creada');

    // ============================================
    // TABLA: Usuarios (Con jerarquía real del C5i)
    // ============================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre_completo VARCHAR(150) NOT NULL,
        usuario VARCHAR(50) NOT NULL UNIQUE COMMENT 'Formato: nombre.apellido',
        password VARCHAR(255) NOT NULL,
        extension VARCHAR(20) COMMENT 'Número de extensión del analista',
        region_id INT NULL COMMENT 'Región asignada (solo para analistas)',
        rol ENUM('super_admin', 'admin', 'analista') NOT NULL DEFAULT 'analista',
        activo BOOLEAN DEFAULT TRUE,
        password_changed BOOLEAN DEFAULT FALSE COMMENT 'FALSE obliga a cambiar contraseña',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (region_id) REFERENCES regiones(id) ON DELETE SET NULL,
        INDEX idx_usuario (usuario),
        INDEX idx_region (region_id),
        INDEX idx_rol (rol)
      )
    `);
    console.log('✅ Tabla usuarios creada');

    // ============================================
    // TABLA: Solicitudes (Trámites)
    // ============================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS solicitudes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        numero_solicitud VARCHAR(50) UNIQUE NOT NULL,
        usuario_id INT NOT NULL COMMENT 'Analista que procesa',
        tipo_oficio_id INT,
        municipio_id INT,
        proceso_movimiento VARCHAR(255),
        termino VARCHAR(100),
        dias_horas VARCHAR(50),
        fecha_sello_c5 DATE,
        fecha_recibido_dt DATE,
        fecha_solicitud DATE NOT NULL,
        estatus_id INT DEFAULT 1,
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (tipo_oficio_id) REFERENCES tipos_oficio(id) ON DELETE SET NULL,
        FOREIGN KEY (municipio_id) REFERENCES municipios(id) ON DELETE SET NULL,
        FOREIGN KEY (estatus_id) REFERENCES estatus_solicitudes(id) ON DELETE SET NULL,
        INDEX idx_usuario (usuario_id),
        INDEX idx_estatus (estatus_id),
        INDEX idx_fecha (fecha_solicitud)
      )
    `);
    console.log('✅ Tabla solicitudes creada');

    // ============================================
    // TABLA: Historial de Solicitudes
    // ============================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS historial_solicitudes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        solicitud_id INT NOT NULL,
        usuario_id INT NOT NULL,
        estatus_anterior_id INT,
        estatus_nuevo_id INT,
        comentario TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (estatus_anterior_id) REFERENCES estatus_solicitudes(id) ON DELETE SET NULL,
        FOREIGN KEY (estatus_nuevo_id) REFERENCES estatus_solicitudes(id) ON DELETE SET NULL,
        INDEX idx_solicitud (solicitud_id)
      )
    `);
    console.log('✅ Tabla historial_solicitudes creada');

    console.log('\n🎉 Estructura de base de datos creada correctamente');
    console.log('📊 Ejecuta el seeder para cargar los datos: npm run seed\n');

  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Ejecutar si se llama directamente
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default initDatabase;
