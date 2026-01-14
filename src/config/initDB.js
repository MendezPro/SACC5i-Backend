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

    // Tabla de Regiones
    await connection.query(`
      CREATE TABLE IF NOT EXISTS regiones (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla regiones creada');

    // Tabla de Municipios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS municipios (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        region_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (region_id) REFERENCES regiones(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Tabla municipios creada');

    // Tabla de Tipos de Oficio
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tipos_oficio (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla tipos_oficio creada');

    // Tabla de Estatus de Solicitudes
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

    // Tabla de Usuarios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre_completo VARCHAR(150) NOT NULL,
        usuario VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        fecha_nacimiento DATE,
        region VARCHAR(100),
        extension VARCHAR(20),
        rol ENUM('usuario', 'administrador', 'operador') DEFAULT 'usuario',
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla usuarios creada');

    // Tabla de Solicitudes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS solicitudes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        numero_solicitud VARCHAR(50) UNIQUE NOT NULL,
        usuario_id INT NOT NULL,
        tipo_oficio_id INT,
        municipio_id INT,
        region VARCHAR(100),
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
        FOREIGN KEY (estatus_id) REFERENCES estatus_solicitudes(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Tabla solicitudes creada');

    // Tabla de Historial de Cambios
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
        FOREIGN KEY (estatus_nuevo_id) REFERENCES estatus_solicitudes(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Tabla historial_solicitudes creada');

    // Insertar datos iniciales - Regiones
    await connection.query(`
      INSERT IGNORE INTO regiones (nombre) VALUES
      ('Región I - Norte'),
      ('Región II - Nororiental'),
      ('Región III - Centro'),
      ('Región IV - Sur'),
      ('Región V - Occidente')
    `);
    console.log('✅ Regiones iniciales insertadas');

    // Insertar datos iniciales - Municipios (algunos ejemplos)
    await connection.query(`
      INSERT IGNORE INTO municipios (nombre, region_id) VALUES
      ('Puebla', 3),
      ('Tehuacán', 4),
      ('Atlixco', 3),
      ('San Martín Texmelucan', 3),
      ('Cholula', 3),
      ('Huauchinango', 1),
      ('Teziutlán', 2)
    `);
    console.log('✅ Municipios iniciales insertados');

    // Insertar datos iniciales - Tipos de Oficio
    await connection.query(`
      INSERT IGNORE INTO tipos_oficio (nombre, descripcion) VALUES
      ('Alta', 'Solicitud de alta en el sistema'),
      ('Baja', 'Solicitud de baja del sistema'),
      ('Consulta', 'Consulta de información'),
      ('Modificación', 'Modificación de datos'),
      ('Reporte', 'Reporte de incidencia'),
      ('Queja', 'Queja ciudadana'),
      ('Sugerencia', 'Sugerencia de mejora')
    `);
    console.log('✅ Tipos de oficio iniciales insertados');

    // Insertar datos iniciales - Estatus
    await connection.query(`
      INSERT IGNORE INTO estatus_solicitudes (nombre, descripcion, color) VALUES
      ('Pendiente', 'Solicitud recibida, pendiente de revisión', '#FFA500'),
      ('En Proceso', 'Solicitud en proceso de atención', '#2196F3'),
      ('En Revisión', 'Solicitud en revisión por supervisor', '#FF9800'),
      ('Aprobada', 'Solicitud aprobada', '#4CAF50'),
      ('Rechazada', 'Solicitud rechazada', '#F44336'),
      ('Completada', 'Solicitud completada exitosamente', '#8BC34A'),
      ('Cancelada', 'Solicitud cancelada por el usuario', '#9E9E9E')
    `);
    console.log('✅ Estatus iniciales insertados');

    console.log('\n🎉 Base de datos inicializada correctamente\n');
    console.log('📊 Puedes iniciar el servidor con: npm run dev\n');

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
