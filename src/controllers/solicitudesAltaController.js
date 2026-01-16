import pool from '../config/database.js';

/**
 * CONTROLADOR DE SOLICITUDES - MÓDULO ALTA
 * 
 * Implementa el flujo completo del módulo de ALTA:
 * 1. Creación de solicitud
 * 2. Validación previa C5 (registrar personas)
 * 3. Envío a C3
 * 4. Validación C3
 * 5. Recepción en C5
 * 6-8. Revisión, citas, finalizados
 */

/**
 * FASE 1: CREACIÓN DE SOLICITUD
 * Usuario C5 crea solicitud con datos generales
 */
export const crearSolicitud = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      tipo_oficio_id,
      municipio_id,
      numero_solicitud,
      numero_personas,
      datos_institucionales,
      proceso_movimiento,
      termino,
      dias_horas,
      fecha_sello_c5,
      fecha_recibido_dt,
      fecha_solicitud,
      observaciones
    } = req.body;

    const usuario_id = req.userId;

    // Crear solicitud
    const [result] = await connection.query(
      `INSERT INTO solicitudes (
        tipo_oficio_id, municipio_id, usuario_id, numero_solicitud,
        numero_personas, datos_institucionales, proceso_movimiento,
        termino, dias_horas, fecha_sello_c5, fecha_recibido_dt,
        fecha_solicitud, estatus_id, fase_actual, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'creacion', ?)`,
      [
        tipo_oficio_id, municipio_id, usuario_id, numero_solicitud,
        numero_personas, datos_institucionales, proceso_movimiento,
        termino, dias_horas, fecha_sello_c5, fecha_recibido_dt,
        fecha_solicitud, observaciones
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Solicitud creada exitosamente',
      solicitudId: result.insertId,
      fase: 'creacion',
      siguiente_paso: 'Registrar personas (validacion_previa_c5)'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al crear solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear solicitud',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * FASE 2: VALIDACIÓN PREVIA C5 - Registrar personas
 */
export const registrarPersonas = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { solicitud_id } = req.params;
    const { personas } = req.body; // Array de personas

    // Verificar que la solicitud existe
    const [solicitud] = await connection.query(
      'SELECT * FROM solicitudes WHERE id = ?',
      [solicitud_id]
    );

    if (solicitud.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Insertar cada persona
    const personasCreadas = [];
    for (const persona of personas) {
      const [result] = await connection.query(
        `INSERT INTO personas (
          solicitud_id, nombre_completo, curp, fecha_nacimiento,
          sexo, identificacion_tipo, identificacion_numero,
          direccion, telefono, email, fase_actual
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'captura')`,
        [
          solicitud_id,
          persona.nombre_completo,
          persona.curp,
          persona.fecha_nacimiento,
          persona.sexo,
          persona.identificacion_tipo,
          persona.identificacion_numero,
          persona.direccion,
          persona.telefono,
          persona.email
        ]
      );
      personasCreadas.push(result.insertId);
    }

    // Actualizar fase de solicitud
    await connection.query(
      `UPDATE solicitudes 
       SET fase_actual = 'validacion_previa_c5', estatus_id = 2
       WHERE id = ?`,
      [solicitud_id]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `${personasCreadas.length} personas registradas`,
      personasIds: personasCreadas,
      siguiente_paso: 'Validar cada persona'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar personas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar personas',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Validar o rechazar persona (Validación previa C5)
 */
export const validarPersonaC5 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { persona_id } = req.params;
    const { aprobado, motivo_rechazo_id, observaciones } = req.body;
    const usuario_id = req.userId;

    if (aprobado) {
      // Aprobar persona
      await connection.query(
        `UPDATE personas 
         SET validado_c5 = TRUE, fase_actual = 'validacion_c5'
         WHERE id = ?`,
        [persona_id]
      );

      await connection.commit();
      res.json({
        success: true,
        message: 'Persona aprobada para envío a C3'
      });

    } else {
      // Rechazar persona
      const [persona] = await connection.query(
        'SELECT solicitud_id FROM personas WHERE id = ?',
        [persona_id]
      );

      await connection.query(
        `UPDATE personas 
         SET rechazado = TRUE, validado_c5 = FALSE, 
             motivo_rechazo_id = ?, fase_actual = 'rechazado'
         WHERE id = ?`,
        [motivo_rechazo_id, persona_id]
      );

      // Registrar rechazo
      await connection.query(
        `INSERT INTO rechazos (
          solicitud_id, persona_id, motivo_rechazo_id,
          fase_rechazo, observaciones, rechazado_por
        ) VALUES (?, ?, ?, 'validacion_previa', ?, ?)`,
        [persona[0].solicitud_id, persona_id, motivo_rechazo_id, observaciones, usuario_id]
      );

      await connection.commit();
      res.json({
        success: true,
        message: 'Persona rechazada. Se ha registrado el motivo.'
      });
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error al validar persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar persona',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Enviar solicitud completa a C3
 */
export const enviarAC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { solicitud_id } = req.params;

    // Verificar que todas las personas han sido validadas o rechazadas
    const [personas] = await connection.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN validado_c5 = TRUE THEN 1 ELSE 0 END) as validadas,
              SUM(CASE WHEN rechazado = TRUE THEN 1 ELSE 0 END) as rechazadas
       FROM personas WHERE solicitud_id = ?`,
      [solicitud_id]
    );

    const { total, validadas, rechazadas } = personas[0];

    if (validadas + rechazadas < total) {
      return res.status(400).json({
        success: false,
        message: `Faltan personas por validar. Total: ${total}, Validadas: ${validadas}, Rechazadas: ${rechazadas}`
      });
    }

    if (validadas === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay personas aprobadas para enviar a C3'
      });
    }

    // Actualizar fase
    await connection.query(
      `UPDATE solicitudes 
       SET fase_actual = 'enviado_c3', estatus_id = 3
       WHERE id = ?`,
      [solicitud_id]
    );

    // Actualizar personas aprobadas
    await connection.query(
      `UPDATE personas 
       SET fase_actual = 'enviado_c3'
       WHERE solicitud_id = ? AND validado_c5 = TRUE`,
      [solicitud_id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Solicitud enviada a C3. ${validadas} personas enviadas, ${rechazadas} rechazadas`
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al enviar a C3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar solicitud a C3',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * FASE 3: PANEL C3 - Obtener solicitudes pendientes
 */
export const obtenerSolicitudesC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [solicitudes] = await connection.query(
      `SELECT s.*, m.nombre as municipio_nombre, r.nombre as region_nombre,
              u.nombre as usuario_nombre, u.apellido as usuario_apellido,
              COUNT(p.id) as total_personas
       FROM solicitudes s
       LEFT JOIN municipios m ON s.municipio_id = m.id
       LEFT JOIN regiones r ON m.region_id = r.id
       LEFT JOIN usuarios u ON s.usuario_id = u.id
       LEFT JOIN personas p ON s.id = p.solicitud_id AND p.fase_actual = 'enviado_c3'
       WHERE s.fase_actual = 'enviado_c3'
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );

    res.json({
      success: true,
      total: solicitudes.length,
      solicitudes
    });

  } catch (error) {
    console.error('Error al obtener solicitudes C3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * C3 valida o rechaza solicitud
 */
export const validarSolicitudC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { solicitud_id } = req.params;
    const { aprobado, observaciones, motivo_rechazo_id } = req.body;
    const usuario_id = req.userId;

    if (aprobado) {
      // Aprobar solicitud
      await connection.query(
        `UPDATE solicitudes 
         SET fase_actual = 'validado_c3', estatus_id = 4,
             validado_c3 = TRUE, validado_c3_fecha = NOW(),
             validado_c3_observaciones = ?
         WHERE id = ?`,
        [observaciones, solicitud_id]
      );

      // Actualizar personas
      await connection.query(
        `UPDATE personas 
         SET validado_c3 = TRUE, fase_actual = 'validado_c3'
         WHERE solicitud_id = ? AND fase_actual = 'enviado_c3'`,
        [solicitud_id]
      );

      await connection.commit();
      res.json({
        success: true,
        message: 'Solicitud validada por C3'
      });

    } else {
      // Rechazar solicitud
      await connection.query(
        `UPDATE solicitudes 
         SET fase_actual = 'rechazado', estatus_id = 7
         WHERE id = ?`,
        [solicitud_id]
      );

      // Marcar personas como rechazadas
      await connection.query(
        `UPDATE personas 
         SET rechazado = TRUE, fase_actual = 'rechazado',
             motivo_rechazo_id = ?
         WHERE solicitud_id = ? AND fase_actual = 'enviado_c3'`,
        [motivo_rechazo_id, solicitud_id]
      );

      // Registrar rechazo
      await connection.query(
        `INSERT INTO rechazos (
          solicitud_id, motivo_rechazo_id, fase_rechazo,
          observaciones, rechazado_por
        ) VALUES (?, ?, 'validacion_c3', ?, ?)`,
        [solicitud_id, motivo_rechazo_id, observaciones, usuario_id]
      );

      await connection.commit();
      res.json({
        success: true,
        message: 'Solicitud rechazada por C3'
      });
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error al validar en C3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar solicitud',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Obtener solicitudes validadas por C3 (Panel C5)
 */
export const obtenerSolicitudesValidadasC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const usuario_id = req.userId;
    const { userRole } = req;

    let query = `
      SELECT s.*, m.nombre as municipio_nombre, r.nombre as region_nombre,
             s.validado_c3_observaciones
      FROM solicitudes s
      LEFT JOIN municipios m ON s.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      WHERE s.fase_actual = 'validado_c3'
    `;

    // Filtrar por región si es analista
    if (userRole === 'analista') {
      query += ` AND r.id = (SELECT region_id FROM usuarios WHERE id = ?)`;
    }

    query += ' ORDER BY s.validado_c3_fecha DESC';

    const [solicitudes] = await connection.query(
      query,
      userRole === 'analista' ? [usuario_id] : []
    );

    res.json({
      success: true,
      total: solicitudes.length,
      solicitudes
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Listar mis solicitudes (con filtros de región para analistas)
 */
export const listarSolicitudes = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const usuario_id = req.userId;
    const { userRole } = req;
    const { fase, estatus } = req.query;

    let query = `
      SELECT s.*, m.nombre as municipio_nombre, r.nombre as region_nombre,
             e.nombre as estatus_nombre, t.nombre as tipo_oficio_nombre,
             u.nombre as usuario_nombre, u.apellido as usuario_apellido
      FROM solicitudes s
      LEFT JOIN municipios m ON s.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN estatus_solicitudes e ON s.estatus_id = e.id
      LEFT JOIN tipos_oficio t ON s.tipo_oficio_id = t.id
      LEFT JOIN usuarios u ON s.usuario_id = u.id
      WHERE 1=1
    `;

    const params = [];

    // Filtrar por región si es analista
    if (userRole === 'analista') {
      query += ` AND r.id = (SELECT region_id FROM usuarios WHERE id = ?)`;
      params.push(usuario_id);
    }

    // Filtros opcionales
    if (fase) {
      query += ' AND s.fase_actual = ?';
      params.push(fase);
    }

    if (estatus) {
      query += ' AND s.estatus_id = ?';
      params.push(estatus);
    }

    query += ' ORDER BY s.created_at DESC LIMIT 100';

    const [solicitudes] = await connection.query(query, params);

    res.json({
      success: true,
      total: solicitudes.length,
      solicitudes
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Obtener detalle de solicitud con todas sus personas
 */
export const obtenerDetalleSolicitud = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    const [solicitud] = await connection.query(
      `SELECT s.*, m.nombre as municipio_nombre, m.clave as municipio_clave,
              r.nombre as region_nombre, e.nombre as estatus_nombre,
              t.nombre as tipo_oficio_nombre,
              u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM solicitudes s
       LEFT JOIN municipios m ON s.municipio_id = m.id
       LEFT JOIN regiones r ON m.region_id = r.id
       LEFT JOIN estatus_solicitudes e ON s.estatus_id = e.id
       LEFT JOIN tipos_oficio t ON s.tipo_oficio_id = t.id
       LEFT JOIN usuarios u ON s.usuario_id = u.id
       WHERE s.id = ?`,
      [id]
    );

    if (solicitud.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Obtener personas de la solicitud
    const [personas] = await connection.query(
      `SELECT p.*, mr.descripcion as motivo_rechazo_descripcion
       FROM personas p
       LEFT JOIN motivos_rechazo mr ON p.motivo_rechazo_id = mr.id
       WHERE p.solicitud_id = ?
       ORDER BY p.id`,
      [id]
    );

    // Obtener rechazos si hay
    const [rechazos] = await connection.query(
      `SELECT r.*, mr.descripcion as motivo_descripcion,
              u.nombre as rechazado_por_nombre
       FROM rechazos r
       LEFT JOIN motivos_rechazo mr ON r.motivo_rechazo_id = mr.id
       LEFT JOIN usuarios u ON r.rechazado_por = u.id
       WHERE r.solicitud_id = ?
       ORDER BY r.fecha_rechazo DESC`,
      [id]
    );

    res.json({
      success: true,
      solicitud: solicitud[0],
      personas,
      rechazos
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Obtener motivos de rechazo disponibles
 */
export const obtenerMotivosRechazo = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { categoria } = req.query;

    let query = 'SELECT * FROM motivos_rechazo WHERE activo = TRUE';
    const params = [];

    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }

    query += ' ORDER BY categoria, codigo';

    const [motivos] = await connection.query(query, params);

    res.json({
      success: true,
      motivos
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener motivos de rechazo',
      error: error.message
    });
  } finally {
    connection.release();
  }
};
