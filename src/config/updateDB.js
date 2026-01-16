import pool from './database.js';

async function updateDB() {
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Actualizando estructura de base de datos...\n');

    // 1. Actualizar tabla solicitudes con nuevos campos
    console.log('📋 Actualizando tabla solicitudes...');
    
    // Verificar y agregar columnas una por una
    const columnsToAdd = [
      'ALTER TABLE solicitudes ADD COLUMN numero_personas INT DEFAULT 1',
      'ALTER TABLE solicitudes ADD COLUMN datos_institucionales TEXT',
      `ALTER TABLE solicitudes ADD COLUMN fase_actual ENUM(
        'creacion','validacion_previa_c5','enviado_c3','validado_c3','en_revision',
        'antecedentes_rnpsp','antecedentes_suic','revision_requisitos','revision_cedula',
        'cita_biometrias','verificacion_asistencia','consulta_sim','registro_rnpsp',
        'finalizado','rechazado'
      ) DEFAULT 'creacion'`,
      'ALTER TABLE solicitudes ADD COLUMN validado_c3 BOOLEAN DEFAULT FALSE',
      'ALTER TABLE solicitudes ADD COLUMN validado_c3_fecha DATETIME',
      'ALTER TABLE solicitudes ADD COLUMN validado_c3_observaciones TEXT',
      'ALTER TABLE solicitudes ADD COLUMN antecedentes_rnpsp BOOLEAN',
      'ALTER TABLE solicitudes ADD COLUMN antecedentes_suic BOOLEAN',
      'ALTER TABLE solicitudes ADD COLUMN antecedentes_sim BOOLEAN',
      'ALTER TABLE solicitudes ADD COLUMN cedula_revisada BOOLEAN DEFAULT FALSE',
      'ALTER TABLE solicitudes ADD COLUMN requisitos_cumplidos BOOLEAN DEFAULT FALSE',
      'ALTER TABLE solicitudes ADD COLUMN acuse_final_generado BOOLEAN DEFAULT FALSE',
      'ALTER TABLE solicitudes ADD COLUMN enviado_copias_conocimiento BOOLEAN DEFAULT FALSE',
      'ALTER TABLE solicitudes ADD COLUMN fecha_finalizacion DATETIME'
    ];

    for (const sql of columnsToAdd) {
      try {
        await connection.query(sql);
      } catch (error) {
        // Ignorar si la columna ya existe
        if (error.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    }
    
    console.log('✅ Tabla solicitudes actualizada');

    // 2. Crear tabla personas (cada persona en un oficio)
    console.log('📋 Creando tabla personas...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS personas (
        id INT PRIMARY KEY AUTO_INCREMENT,
        solicitud_id INT NOT NULL,
        nombre_completo VARCHAR(200) NOT NULL,
        curp VARCHAR(18) UNIQUE NOT NULL,
        fecha_nacimiento DATE NOT NULL,
        sexo ENUM('M', 'F') NOT NULL,
        identificacion_tipo VARCHAR(50),
        identificacion_numero VARCHAR(100),
        direccion TEXT,
        telefono VARCHAR(20),
        email VARCHAR(100),
        fotografia_url VARCHAR(255),
        validado_c5 BOOLEAN DEFAULT FALSE,
        validado_c3 BOOLEAN DEFAULT FALSE,
        rechazado BOOLEAN DEFAULT FALSE,
        motivo_rechazo_id INT,
        fase_actual ENUM(
          'captura',
          'validacion_c5',
          'enviado_c3',
          'validado_c3',
          'en_proceso',
          'finalizado',
          'rechazado'
        ) DEFAULT 'captura',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
        INDEX idx_solicitud (solicitud_id),
        INDEX idx_curp (curp),
        INDEX idx_fase (fase_actual)
      )
    `);
    console.log('✅ Tabla personas creada');

    // 3. Crear tabla motivos_rechazo
    console.log('📋 Creando tabla motivos_rechazo...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS motivos_rechazo (
        id INT PRIMARY KEY AUTO_INCREMENT,
        codigo VARCHAR(20) UNIQUE NOT NULL,
        categoria ENUM(
          'validacion_previa',
          'validacion_c3',
          'antecedentes',
          'requisitos',
          'cedula',
          'cita_vestimenta',
          'cita_inasistencia',
          'sim',
          'otro'
        ) NOT NULL,
        descripcion TEXT NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla motivos_rechazo creada');

    // 4. Crear tabla rechazos (registro de cada rechazo)
    console.log('📋 Creando tabla rechazos...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rechazos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        solicitud_id INT,
        persona_id INT,
        motivo_rechazo_id INT NOT NULL,
        fase_rechazo VARCHAR(50) NOT NULL,
        observaciones TEXT,
        rechazado_por INT NOT NULL,
        acuse_generado BOOLEAN DEFAULT FALSE,
        acuse_url VARCHAR(255),
        oficio_respuesta_generado BOOLEAN DEFAULT FALSE,
        oficio_respuesta_url VARCHAR(255),
        email_enviado BOOLEAN DEFAULT FALSE,
        fecha_rechazo DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (motivo_rechazo_id) REFERENCES motivos_rechazo(id),
        FOREIGN KEY (rechazado_por) REFERENCES usuarios(id),
        INDEX idx_solicitud (solicitud_id),
        INDEX idx_persona (persona_id),
        INDEX idx_fecha (fecha_rechazo)
      )
    `);
    console.log('✅ Tabla rechazos creada');

    // 5. Crear tabla citas_biometrias
    console.log('📋 Creando tabla citas_biometrias...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS citas_biometrias (
        id INT PRIMARY KEY AUTO_INCREMENT,
        persona_id INT NOT NULL,
        solicitud_id INT NOT NULL,
        fecha_cita DATE NOT NULL,
        hora_cita TIME,
        direccion TEXT,
        observaciones TEXT,
        email_enviado BOOLEAN DEFAULT FALSE,
        fecha_envio_email DATETIME,
        asistio BOOLEAN,
        cumple_vestimenta BOOLEAN,
        motivo_incumplimiento TEXT,
        huellas_capturadas BOOLEAN DEFAULT FALSE,
        registro_rnpsp_completado BOOLEAN DEFAULT FALSE,
        acuse_generado BOOLEAN DEFAULT FALSE,
        acuse_url VARCHAR(255),
        cita_vencida BOOLEAN DEFAULT FALSE,
        realizada_satisfactoriamente BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
        INDEX idx_fecha_cita (fecha_cita),
        INDEX idx_persona (persona_id)
      )
    `);
    console.log('✅ Tabla citas_biometrias creada');

    // 6. Crear tabla requisitos_verificacion
    console.log('📋 Creando tabla requisitos_verificacion...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS requisitos_verificacion (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        orden INT NOT NULL,
        obligatorio BOOLEAN DEFAULT TRUE,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla requisitos_verificacion creada');

    // 7. Crear tabla solicitudes_requisitos (relación muchos a muchos)
    console.log('📋 Creando tabla solicitudes_requisitos...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS solicitudes_requisitos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        solicitud_id INT NOT NULL,
        requisito_id INT NOT NULL,
        cumple BOOLEAN DEFAULT FALSE,
        observaciones TEXT,
        verificado_por INT,
        fecha_verificacion DATETIME,
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
        FOREIGN KEY (requisito_id) REFERENCES requisitos_verificacion(id),
        FOREIGN KEY (verificado_por) REFERENCES usuarios(id),
        INDEX idx_solicitud (solicitud_id)
      )
    `);
    console.log('✅ Tabla solicitudes_requisitos creada');

    // 8. Crear tabla documentos_generados
    console.log('📋 Creando tabla documentos_generados...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS documentos_generados (
        id INT PRIMARY KEY AUTO_INCREMENT,
        solicitud_id INT,
        persona_id INT,
        tipo_documento ENUM(
          'acuse_rechazo',
          'oficio_respuesta',
          'acuse_cita',
          'acuse_final'
        ) NOT NULL,
        nombre_archivo VARCHAR(255) NOT NULL,
        url VARCHAR(255) NOT NULL,
        formato ENUM('pdf', 'docx') NOT NULL,
        generado_por INT NOT NULL,
        fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (generado_por) REFERENCES usuarios(id),
        INDEX idx_solicitud (solicitud_id),
        INDEX idx_tipo (tipo_documento)
      )
    `);
    console.log('✅ Tabla documentos_generados creada');

    // 9. Insertar motivos de rechazo predefinidos
    console.log('📋 Insertando motivos de rechazo predefinidos...');
    await connection.query(`
      INSERT IGNORE INTO motivos_rechazo (codigo, categoria, descripcion) VALUES
      ('VAL_C5_001', 'validacion_previa', 'Documentación incompleta'),
      ('VAL_C5_002', 'validacion_previa', 'CURP inválido o no coincide'),
      ('VAL_C5_003', 'validacion_previa', 'Datos personales incorrectos'),
      ('VAL_C3_001', 'validacion_c3', 'No cumple requisitos institucionales'),
      ('VAL_C3_002', 'validacion_c3', 'Información inconsistente'),
      ('ANT_001', 'antecedentes', 'Antecedentes en RNPSP'),
      ('ANT_002', 'antecedentes', 'Antecedentes en SUIC'),
      ('ANT_003', 'antecedentes', 'Antecedentes en SIM'),
      ('REQ_001', 'requisitos', 'No cumple con requisitos mínimos'),
      ('CED_001', 'cedula', 'Cédula no válida o con observaciones'),
      ('CITA_VEST_001', 'cita_vestimenta', 'Acudió con maquillaje'),
      ('CITA_VEST_002', 'cita_vestimenta', 'Acudió con aretes'),
      ('CITA_VEST_003', 'cita_vestimenta', 'Cabello largo sin recoger'),
      ('CITA_VEST_004', 'cita_vestimenta', 'Camisa de color no permitido'),
      ('CITA_VEST_005', 'cita_vestimenta', 'Pelo pintado'),
      ('CITA_INA_001', 'cita_inasistencia', 'No acudió a la cita'),
      ('CITA_INA_002', 'cita_inasistencia', 'Cita vencida'),
      ('OTRO_001', 'otro', 'Otro motivo (especificar en observaciones)')
    `);
    console.log('✅ Motivos de rechazo insertados');

    // 10. Insertar requisitos de verificación predefinidos
    console.log('📋 Insertando requisitos de verificación...');
    await connection.query(`
      INSERT IGNORE INTO requisitos_verificacion (nombre, orden) VALUES
      ('Identificación oficial vigente', 1),
      ('CURP', 2),
      ('Comprobante de domicilio', 3),
      ('Certificado médico', 4),
      ('Certificado de estudios', 5),
      ('Carta de no antecedentes penales', 6),
      ('Fotografías tamaño infantil', 7),
      ('Acta de nacimiento', 8),
      ('Constancia de servicio', 9),
      ('Evaluaciones de control de confianza', 10)
    `);
    console.log('✅ Requisitos de verificación insertados');

    console.log('\n✅ Estructura de base de datos actualizada correctamente\n');

  } catch (error) {
    console.error('❌ Error al actualizar base de datos:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Ejecutar actualización
updateDB()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
