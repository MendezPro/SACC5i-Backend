import pool from '../config/database.js';

// ============================================
// PASO 1: NUEVA SOLICITUD DE ALTA
// ============================================

// Generar número de solicitud único para ALTA
const generateNumeroSolicitud = async (connection) => {
  const year = new Date().getFullYear();
  const [result] = await connection.query(
    'SELECT COUNT(*) as total FROM tramites_alta WHERE YEAR(created_at) = ?',
    [year]
  );
  
  const sequential = (result[0].total + 1).toString().padStart(6, '0');
  return `ALTA-${year}-${sequential}`;
};

/**
 * PASO 1: Crear nueva solicitud de ALTA
 * Imagen 5 del mockup - Formulario "Nueva Solicitud de Alta"
 */
export const crearNuevaSolicitud = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      tipo_oficio_id,
      municipio_id,
      dependencia_id,
      proceso_movimiento = 'ALTA',
      termino,
      dias_horas,
      fecha_sello_c5,
      fecha_recibido_dt,
      fecha_solicitud,
      observaciones
    } = req.body;

    // Verificar que el usuario sea analista C5
    const [usuario] = await connection.query(
      'SELECT rol FROM usuarios WHERE id = ?',
      [req.userId]
    );

    if (!usuario || usuario[0].rol !== 'analista') {
      return res.status(403).json({
        success: false,
        message: 'Solo los analistas C5 pueden crear solicitudes de ALTA'
      });
    }

    // Generar número de solicitud
    const numero_solicitud = await generateNumeroSolicitud(connection);

    // Insertar trámite de ALTA
    const [result] = await connection.query(
      `INSERT INTO tramites_alta (
        numero_solicitud,
        usuario_analista_c5_id,
        tipo_oficio_id,
        municipio_id,
        dependencia_id,
        proceso_movimiento,
        termino,
        dias_horas,
        fecha_sello_c5,
        fecha_recibido_dt,
        fecha_solicitud,
        observaciones,
        fase_actual,
        estatus_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'datos_solicitud', 1)`,
      [
        numero_solicitud,
        req.userId,
        tipo_oficio_id,
        municipio_id,
        dependencia_id,
        proceso_movimiento,
        termino,
        dias_horas,
        fecha_sello_c5,
        fecha_recibido_dt,
        fecha_solicitud,
        observaciones
      ]
    );

    const tramite_id = result.insertId;

    // Registrar en historial
    await connection.query(
      `INSERT INTO historial_tramites_alta (
        tramite_alta_id, 
        usuario_id, 
        fase_anterior, 
        fase_nueva, 
        comentario
      ) VALUES (?, ?, NULL, 'datos_solicitud', 'Solicitud creada')`,
      [tramite_id, req.userId]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Solicitud de ALTA creada exitosamente',
      data: {
        id: tramite_id,
        numero_solicitud,
        fase_actual: 'datos_solicitud'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al crear solicitud de ALTA:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear solicitud de ALTA',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Obtener todas las solicitudes de ALTA del analista
 */
export const obtenerMisSolicitudes = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { fase, fecha_inicio, fecha_fin, busqueda } = req.query;
    
    let query = `
      SELECT 
        t.*,
        m.nombre as municipio_nombre,
        r.nombre as region_nombre,
        tipo_ofi.nombre as tipo_oficio_nombre,
        dep.nombre as dependencia_nombre,
        ua.nombre_completo as analista_nombre,
        uv.nombre_completo as validador_c3_nombre
      FROM tramites_alta t
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN tipos_oficio tipo_ofi ON t.tipo_oficio_id = tipo_ofi.id
      LEFT JOIN dependencias dep ON t.dependencia_id = dep.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      LEFT JOIN usuarios uv ON t.usuario_validador_c3_id = uv.id
      WHERE t.usuario_analista_c5_id = ?
    `;
    
    const params = [req.userId];

    if (fase) {
      query += ' AND t.fase_actual = ?';
      params.push(fase);
    }

    if (fecha_inicio && fecha_fin) {
      query += ' AND t.fecha_solicitud BETWEEN ? AND ?';
      params.push(fecha_inicio, fecha_fin);
    }

    if (busqueda) {
      query += ' AND (t.numero_solicitud LIKE ? OR dep.nombre LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }

    query += ' ORDER BY t.created_at DESC';

    const [solicitudes] = await connection.query(query, params);

    res.json({
      success: true,
      data: solicitudes,
      total: solicitudes.length
    });

  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
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
 * Obtener una solicitud específica con historial
 */
export const obtenerSolicitudPorId = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    const [solicitudes] = await connection.query(
      `SELECT 
        t.*,
        m.nombre as municipio_nombre,
        r.nombre as region_nombre,
        tipo_ofi.nombre as tipo_oficio_nombre,
        dep.nombre as dependencia_nombre,
        ua.nombre_completo as analista_nombre,
        uv.nombre_completo as validador_c3_nombre
      FROM tramites_alta t
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN tipos_oficio tipo_ofi ON t.tipo_oficio_id = tipo_ofi.id
      LEFT JOIN dependencias dep ON t.dependencia_id = dep.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      LEFT JOIN usuarios uv ON t.usuario_validador_c3_id = uv.id
      WHERE t.id = ? AND t.usuario_analista_c5_id = ?`,
      [id, req.userId]
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Obtener personas del trámite
    const [personas] = await connection.query(
      `SELECT 
        p.*,
        pu.nombre as puesto_nombre,
        pu.es_competencia_municipal,
        pu.motivo_no_competencia
      FROM personas_tramite_alta p
      LEFT JOIN puestos pu ON p.puesto_id = pu.id
      WHERE p.tramite_alta_id = ?
      ORDER BY p.created_at ASC`,
      [id]
    );

    // Obtener historial
    const [historial] = await connection.query(
      `SELECT 
        h.*,
        u.nombre_completo as usuario_nombre
      FROM historial_tramites_alta h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE h.tramite_alta_id = ?
      ORDER BY h.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...solicitudes[0],
        personas,
        historial
      }
    });

  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitud',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ============================================
// PASO 2: VALIDACIÓN DE PERSONAL (Próximamente)
// ============================================

/**
 * PASO 2: Agregar personas a validar
 * Imagen 6 del mockup - "Validación de Personal"
 */
export const agregarPersonasParaValidar = async (req, res) => {
  // TODO: Implementar PASO 2
  res.status(501).json({
    success: false,
    message: 'PASO 2: Validación de Personal - En desarrollo'
  });
};

/**
 * Enviar solicitud a C3 (después de validar personal)
 */
export const enviarSolicitudAC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { tramite_id } = req.body;

    // Verificar que el trámite existe y es del analista
    const [tramites] = await connection.query(
      'SELECT * FROM tramites_alta WHERE id = ? AND usuario_analista_c5_id = ?',
      [tramite_id, req.userId]
    );

    if (tramites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Trámite no encontrado o no tienes permisos'
      });
    }

    const tramite = tramites[0];

    // Verificar que está en una fase que permite envío a C3
    if (!['datos_solicitud', 'validacion_personal'].includes(tramite.fase_actual)) {
      return res.status(400).json({
        success: false,
        message: `No se puede enviar a C3 desde la fase: ${tramite.fase_actual}`
      });
    }

    // Actualizar fase a enviado_c3
    await connection.query(
      'UPDATE tramites_alta SET fase_actual = ? WHERE id = ?',
      ['enviado_c3', tramite_id]
    );

    // Registrar en historial
    await connection.query(
      `INSERT INTO historial_tramites_alta (
        tramite_alta_id, 
        usuario_id, 
        fase_anterior, 
        fase_nueva, 
        comentario
      ) VALUES (?, ?, ?, 'enviado_c3', 'Solicitud enviada a C3 para dictamen')`,
      [tramite_id, req.userId, tramite.fase_actual]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Solicitud enviada a C3 exitosamente',
      data: {
        tramite_id,
        numero_solicitud: tramite.numero_solicitud,
        fase_nueva: 'enviado_c3'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al enviar solicitud a C3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar solicitud a C3',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ============================================
// PASO 3: DICTAMEN C3
// ============================================

/**
 * PASO 3: Recibir solicitudes pendientes (Vista C3)
 * Imágenes 3, 4, 7 del mockup - "Panel de Validación C3"
 */
export const obtenerSolicitudesPendientesC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // Obtener trámites que fueron enviados a C3 y están pendientes de dictamen
    const [solicitudes] = await connection.query(
      `SELECT 
        t.*,
        m.nombre as municipio_nombre,
        r.nombre as region_nombre,
        tipo_ofi.nombre as tipo_oficio_nombre,
        dep.nombre as dependencia_nombre,
        ua.nombre_completo as analista_nombre,
        ua.extension as analista_extension
      FROM tramites_alta t
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN tipos_oficio tipo_ofi ON t.tipo_oficio_id = tipo_ofi.id
      LEFT JOIN dependencias dep ON t.dependencia_id = dep.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      WHERE t.fase_actual = 'enviado_c3'
      ORDER BY t.created_at ASC`
    );

    // Para cada trámite, obtener sus personas
    for (let tramite of solicitudes) {
      const [personas] = await connection.query(
        `SELECT 
          p.*,
          pu.nombre as puesto_nombre,
          pu.es_competencia_municipal,
          pu.motivo_no_competencia
        FROM personas_tramite_alta p
        LEFT JOIN puestos pu ON p.puesto_id = pu.id
        WHERE p.tramite_alta_id = ?
        ORDER BY p.created_at ASC`,
        [tramite.id]
      );
      tramite.personas = personas;
    }

    res.json({
      success: true,
      data: solicitudes,
      total: solicitudes.length,
      message: `${solicitudes.length} solicitudes pendientes de dictamen C3`
    });

  } catch (error) {
    console.error('Error al obtener solicitudes pendientes C3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes pendientes',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Obtener detalle de una solicitud para C3
 * Permite a C3 ver cualquier solicitud enviada para validación
 */
export const obtenerSolicitudParaC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    const [solicitudes] = await connection.query(
      `SELECT 
        t.*,
        m.nombre as municipio_nombre,
        r.nombre as region_nombre,
        tipo_ofi.nombre as tipo_oficio_nombre,
        dep.nombre as dependencia_nombre,
        ua.nombre_completo as analista_nombre,
        ua.extension as analista_extension,
        uv.nombre_completo as validador_c3_nombre
      FROM tramites_alta t
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN tipos_oficio tipo_ofi ON t.tipo_oficio_id = tipo_ofi.id
      LEFT JOIN dependencias dep ON t.dependencia_id = dep.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      LEFT JOIN usuarios uv ON t.usuario_validador_c3_id = uv.id
      WHERE t.id = ? AND t.fase_actual IN ('enviado_c3', 'validado_c3', 'rechazado', 'rechazado_no_corresponde')`,
      [id]
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada o no disponible para C3'
      });
    }

    // Obtener personas del trámite
    const [personas] = await connection.query(
      `SELECT 
        p.*,
        pu.nombre as puesto_nombre,
        pu.es_competencia_municipal,
        pu.motivo_no_competencia
      FROM personas_tramite_alta p
      LEFT JOIN puestos pu ON p.puesto_id = pu.id
      WHERE p.tramite_alta_id = ?
      ORDER BY p.created_at ASC`,
      [id]
    );

    // Obtener historial
    const [historial] = await connection.query(
      `SELECT 
        h.*,
        u.nombre_completo as usuario_nombre
      FROM historial_tramites_alta h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE h.tramite_alta_id = ?
      ORDER BY h.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...solicitudes[0],
        personas,
        historial
      }
    });

  } catch (error) {
    console.error('Error al obtener solicitud para C3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitud',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

export const emitirDictamenC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { tramite_id, dictamen, observaciones_c3, propuestas_cambio_puesto } = req.body;

    // Verificar que el trámite existe y está en fase enviado_c3
    const [tramites] = await connection.query(
      'SELECT * FROM tramites_alta WHERE id = ? AND fase_actual = ?',
      [tramite_id, 'enviado_c3']
    );

    if (tramites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Trámite no encontrado o no está en fase de validación C3'
      });
    }

    // Si hay propuestas de cambio de puesto, procesarlas
    let tienePropuestas = false;
    if (propuestas_cambio_puesto && Array.isArray(propuestas_cambio_puesto) && propuestas_cambio_puesto.length > 0) {
      for (const propuesta of propuestas_cambio_puesto) {
        const { persona_id, puesto_propuesto_id } = propuesta;
        
        if (persona_id && puesto_propuesto_id) {
          // Actualizar persona con propuesta de cambio
          await connection.query(
            `UPDATE personas_tramite_alta 
             SET puesto_propuesto_c3_id = ?,
                 tiene_propuesta_cambio = TRUE,
                 decision_final_c5 = 'pendiente'
             WHERE id = ? AND tramite_alta_id = ?`,
            [puesto_propuesto_id, persona_id, tramite_id]
          );
          tienePropuestas = true;
        }
      }
    }

    let nuevaFase;
    if (tienePropuestas) {
      // Si hay propuestas, enviar a revisión de C5
      nuevaFase = 'revision_propuesta_c3';
    } else if (dictamen === 'ALTA OK' || dictamen === 'APROBADO') {
      nuevaFase = 'validado_c3';
    } else if (dictamen === 'NO PUEDE SER DADO DE ALTA' || dictamen === 'RECHAZADO') {
      nuevaFase = 'rechazado';
    } else {
      nuevaFase = 'filtro_competencia_c5';
    }

    // Actualizar trámite con dictamen C3
    await connection.query(
      `UPDATE tramites_alta 
       SET fase_actual = ?,
           usuario_validador_c3_id = ?,
           observaciones = CONCAT(COALESCE(observaciones, ''), '\n\n[DICTAMEN C3]: ', ?)
       WHERE id = ?`,
      [nuevaFase, req.userId, observaciones_c3 || dictamen, tramite_id]
    );

    // Registrar en historial
    const comentarioHistorial = tienePropuestas 
      ? `Dictamen C3: ${dictamen} - CON PROPUESTAS DE CAMBIO DE PUESTO` 
      : `Dictamen C3: ${dictamen}`;

    await connection.query(
      `INSERT INTO historial_tramites_alta (
        tramite_alta_id, 
        usuario_id, 
        fase_anterior, 
        fase_nueva, 
        comentario
      ) VALUES (?, ?, 'enviado_c3', ?, ?)`,
      [tramite_id, req.userId, nuevaFase, comentarioHistorial]
    );

    await connection.commit();

    res.json({
      success: true,
      message: tienePropuestas 
        ? 'Dictamen C3 registrado con propuestas de cambio de puesto. Enviado a revisión de C5'
        : 'Dictamen C3 registrado exitosamente',
      data: {
        tramite_id,
        dictamen,
        fase_nueva: nuevaFase,
        tiene_propuestas: tienePropuestas
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al emitir dictamen C3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al emitir dictamen',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Obtener historial de trámites procesados por C3
 * Solo para validadores C3 - Ver trámites que ya fueron dictaminados
 */
export const obtenerHistorialC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { fecha_inicio, fecha_fin, busqueda, dictamen } = req.query;

    let query = `
      SELECT 
        t.*,
        m.nombre as municipio_nombre,
        r.nombre as region_nombre,
        tipo_ofi.nombre as tipo_oficio_nombre,
        dep.nombre as dependencia_nombre,
        ua.nombre_completo as analista_nombre,
        ua.extension as analista_extension,
        uv.nombre_completo as validador_c3_nombre
      FROM tramites_alta t
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN tipos_oficio tipo_ofi ON t.tipo_oficio_id = tipo_ofi.id
      LEFT JOIN dependencias dep ON t.dependencia_id = dep.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      LEFT JOIN usuarios uv ON t.usuario_validador_c3_id = uv.id
      WHERE (t.fase_actual = 'validado_c3' OR t.fase_actual = 'rechazado' OR t.fase_actual = 'rechazado_no_corresponde')
    `;

    const params = [];

    // Filtrar por el validador C3 que emitió el dictamen (solo ver los propios)
    query += ' AND t.usuario_validador_c3_id = ?';
    params.push(req.userId);

    if (fecha_inicio && fecha_fin) {
      query += ' AND t.updated_at BETWEEN ? AND ?';
      params.push(fecha_inicio, fecha_fin);
    }

    if (busqueda) {
      query += ' AND (t.numero_solicitud LIKE ? OR m.nombre LIKE ? OR dep.nombre LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    if (dictamen) {
      query += ' AND t.fase_actual = ?';
      params.push(dictamen);
    }

    query += ' ORDER BY t.updated_at DESC';

    const [tramites] = await connection.query(query, params);

    // Para cada trámite, obtener el conteo de personas
    for (let tramite of tramites) {
      const [personas] = await connection.query(
        `SELECT COUNT(*) as total,
         SUM(CASE WHEN validado = TRUE THEN 1 ELSE 0 END) as validadas,
         SUM(CASE WHEN rechazado = TRUE THEN 1 ELSE 0 END) as rechazadas
         FROM personas_tramite_alta
         WHERE tramite_alta_id = ?`,
        [tramite.id]
      );
      tramite.personas_stats = personas[0];
    }

    res.json({
      success: true,
      data: tramites,
      total: tramites.length,
      message: `${tramites.length} trámites procesados en historial`
    });

  } catch (error) {
    console.error('Error al obtener historial C3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ============================================
// PASO 2: VALIDACIÓN DE PERSONAL
// ============================================

/**
 * Agregar persona al trámite (PASO 2)
 * Imagen 6 del mockup - Formulario "Validación de Personal"
 */
export const agregarPersona = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { tramite_id } = req.params;
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      fecha_nacimiento,
      numero_oficio_c3,
      puesto_id
    } = req.body;

    // Verificar que el trámite existe y pertenece al analista
    const [tramites] = await connection.query(
      `SELECT * FROM tramites_alta 
       WHERE id = ? AND usuario_analista_c5_id = ?`,
      [tramite_id, req.userId]
    );

    if (tramites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Trámite no encontrado o no tienes permiso'
      });
    }

    // Verificar si el puesto es de competencia municipal
    const [puestos] = await connection.query(
      'SELECT * FROM puestos WHERE id = ?',
      [puesto_id]
    );

    if (puestos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Puesto no encontrado'
      });
    }

    const puesto = puestos[0];

    // Si NO es competencia municipal, rechazar automáticamente
    const rechazado = !puesto.es_competencia_municipal;
    const motivo_rechazo = rechazado ? puesto.motivo_no_competencia : null;

    // Insertar persona
    const [result] = await connection.query(
      `INSERT INTO personas_tramite_alta (
        tramite_alta_id,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_nacimiento,
        numero_oficio_c3,
        puesto_id,
        validado,
        rechazado,
        motivo_rechazo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tramite_id,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_nacimiento,
        numero_oficio_c3,
        puesto_id,
        false, // validado
        rechazado,
        motivo_rechazo
      ]
    );

    // Si se agregó la primera persona, cambiar fase a validacion_personal
    const [countPersonas] = await connection.query(
      'SELECT COUNT(*) as total FROM personas_tramite_alta WHERE tramite_alta_id = ?',
      [tramite_id]
    );

    if (countPersonas[0].total === 1 && tramites[0].fase_actual === 'datos_solicitud') {
      await connection.query(
        'UPDATE tramites_alta SET fase_actual = ? WHERE id = ?',
        ['validacion_personal', tramite_id]
      );

      await connection.query(
        `INSERT INTO historial_tramites_alta (
          tramite_alta_id, usuario_id, fase_anterior, fase_nueva, comentario
        ) VALUES (?, ?, ?, ?, ?)`,
        [tramite_id, req.userId, 'datos_solicitud', 'validacion_personal', 'Inicio de validación de personal']
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: rechazado 
        ? `Persona agregada y rechazada automáticamente: ${puesto.nombre} no corresponde a competencia municipal`
        : 'Persona agregada exitosamente',
      data: {
        persona_id: result.insertId,
        rechazado,
        motivo_rechazo,
        puesto_nombre: puesto.nombre
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al agregar persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar persona',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Obtener personas del trámite
 */
export const obtenerPersonasPorTramite = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { tramite_id } = req.params;

    const [personas] = await connection.query(
      `SELECT 
        p.*,
        pu.nombre as puesto_nombre,
        pu.es_competencia_municipal,
        pu_propuesto.nombre as puesto_propuesto_nombre,
        pu_propuesto.es_competencia_municipal as puesto_propuesto_es_municipal
      FROM personas_tramite_alta p
      LEFT JOIN puestos pu ON p.puesto_id = pu.id
      LEFT JOIN puestos pu_propuesto ON p.puesto_propuesto_c3_id = pu_propuesto.id
      WHERE p.tramite_alta_id = ?
      ORDER BY p.created_at ASC`,
      [tramite_id]
    );

    res.json({
      success: true,
      data: personas,
      total: personas.length
    });

  } catch (error) {
    console.error('Error al obtener personas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener personas',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Validar persona (marcar como aprobada)
 */
export const validarPersona = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { persona_id } = req.params;

    // Verificar que la persona existe y pertenece a un trámite del analista
    const [personas] = await connection.query(
      `SELECT p.*, t.usuario_analista_c5_id 
       FROM personas_tramite_alta p
       JOIN tramites_alta t ON p.tramite_alta_id = t.id
       WHERE p.id = ?`,
      [persona_id]
    );

    if (personas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    if (personas[0].usuario_analista_c5_id !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para validar esta persona'
      });
    }

    if (personas[0].rechazado) {
      return res.status(400).json({
        success: false,
        message: 'No se puede validar una persona que ya fue rechazada'
      });
    }

    // Validar persona
    await connection.query(
      'UPDATE personas_tramite_alta SET validado = TRUE WHERE id = ?',
      [persona_id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Persona validada exitosamente'
    });

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
 * Rechazar persona manualmente
 */
export const rechazarPersona = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { persona_id } = req.params;
    const { motivo_rechazo } = req.body;

    if (!motivo_rechazo) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar un motivo de rechazo'
      });
    }

    // Verificar que la persona existe y pertenece a un trámite del analista
    const [personas] = await connection.query(
      `SELECT p.*, t.usuario_analista_c5_id 
       FROM personas_tramite_alta p
       JOIN tramites_alta t ON p.tramite_alta_id = t.id
       WHERE p.id = ?`,
      [persona_id]
    );

    if (personas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    if (personas[0].usuario_analista_c5_id !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para rechazar esta persona'
      });
    }

    if (personas[0].validado) {
      return res.status(400).json({
        success: false,
        message: 'No se puede rechazar una persona que ya fue validada'
      });
    }

    // Rechazar persona
    await connection.query(
      `UPDATE personas_tramite_alta 
       SET rechazado = TRUE, validado = FALSE, motivo_rechazo = ?
       WHERE id = ?`,
      [motivo_rechazo, persona_id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Persona rechazada exitosamente'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al rechazar persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar persona',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ============================================
// TABLA DE RECHAZADOS (Solo C5)
// ============================================

/**
 * Obtener todos los trámites rechazados
 * Vista general de rechazados para analistas C5
 * Incluye trámites rechazados en cualquier etapa del proceso
 */
export const obtenerTramitesRechazados = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { fecha_inicio, fecha_fin, busqueda, fase_rechazo } = req.query;

    let query = `
      SELECT 
        t.*,
        m.nombre as municipio_nombre,
        r.nombre as region_nombre,
        tipo_ofi.nombre as tipo_oficio_nombre,
        dep.nombre as dependencia_nombre,
        ua.nombre_completo as analista_nombre,
        uv.nombre_completo as validador_c3_nombre
      FROM tramites_alta t
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN tipos_oficio tipo_ofi ON t.tipo_oficio_id = tipo_ofi.id
      LEFT JOIN dependencias dep ON t.dependencia_id = dep.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      LEFT JOIN usuarios uv ON t.usuario_validador_c3_id = uv.id
      WHERE (t.fase_actual = 'rechazado' OR t.fase_actual = 'rechazado_no_corresponde')
    `;

    const params = [];

    if (fecha_inicio && fecha_fin) {
      query += ' AND t.updated_at BETWEEN ? AND ?';
      params.push(fecha_inicio, fecha_fin);
    }

    if (busqueda) {
      query += ' AND (t.numero_solicitud LIKE ? OR m.nombre LIKE ? OR dep.nombre LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    if (fase_rechazo) {
      query += ' AND t.fase_actual = ?';
      params.push(fase_rechazo);
    }

    query += ' ORDER BY t.updated_at DESC';

    const [tramites] = await connection.query(query, params);

    // Para cada trámite, obtener personas y detectar si fue por competencia
    for (let tramite of tramites) {
      const [personas] = await connection.query(
        `SELECT 
          p.*,
          pu.nombre as puesto_nombre,
          pu.es_competencia_municipal,
          pu.motivo_no_competencia
        FROM personas_tramite_alta p
        LEFT JOIN puestos pu ON p.puesto_id = pu.id
        WHERE p.tramite_alta_id = ?
        ORDER BY p.created_at ASC`,
        [tramite.id]
      );

      // Detectar motivo de rechazo según la fase
      let motivo_rechazo_general = '';
      let etapa_rechazo = '';

      if (tramite.fase_actual === 'rechazado_no_corresponde') {
        etapa_rechazo = 'Validación de Personal (Filtro de Competencia)';
        const personasNoCompetencia = personas.filter(p => !p.es_competencia_municipal);
        if (personasNoCompetencia.length > 0) {
          motivo_rechazo_general = `Puesto(s) fuera de competencia municipal: ${personasNoCompetencia.map(p => p.puesto_nombre).join(', ')}`;
        }
      } else if (tramite.fase_actual === 'rechazado') {
        etapa_rechazo = 'Dictamen C3';
        motivo_rechazo_general = tramite.observaciones || 'Rechazado por C3';
      }

      // Obtener historial para ver en qué momento fue rechazado
      const [historial] = await connection.query(
        `SELECT comentario, created_at 
         FROM historial_tramites_alta 
         WHERE tramite_alta_id = ? AND fase_nueva IN ('rechazado', 'rechazado_no_corresponde')
         ORDER BY created_at DESC LIMIT 1`,
        [tramite.id]
      );

      tramite.personas = personas;
      tramite.etapa_rechazo = etapa_rechazo;
      tramite.motivo_rechazo_general = motivo_rechazo_general;
      tramite.fecha_rechazo = historial[0]?.created_at || tramite.updated_at;
      tramite.comentario_rechazo = historial[0]?.comentario || '';
    }

    res.json({
      success: true,
      data: tramites,
      total: tramites.length,
      message: `${tramites.length} trámites rechazados encontrados`
    });

  } catch (error) {
    console.error('Error al obtener trámites rechazados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener trámites rechazados',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ============================================
// REVISIÓN DE PROPUESTAS C3 (Solo C5)
// ============================================

/**
 * Obtener trámites con propuestas de cambio de puesto de C3
 * Vista para que C5 revise y emita decisión final
 */
export const obtenerPropuestasC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { busqueda } = req.query;

    let query = `
      SELECT 
        t.*,
        m.nombre as municipio_nombre,
        r.nombre as region_nombre,
        tipo_ofi.nombre as tipo_oficio_nombre,
        dep.nombre as dependencia_nombre,
        ua.nombre_completo as analista_nombre,
        uv.nombre_completo as validador_c3_nombre
      FROM tramites_alta t
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN tipos_oficio tipo_ofi ON t.tipo_oficio_id = tipo_ofi.id
      LEFT JOIN dependencias dep ON t.dependencia_id = dep.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      LEFT JOIN usuarios uv ON t.usuario_validador_c3_id = uv.id
      WHERE t.fase_actual = 'revision_propuesta_c3'
        AND t.usuario_analista_c5_id = ?
    `;

    const params = [req.userId];

    if (busqueda) {
      query += ' AND (t.numero_solicitud LIKE ? OR m.nombre LIKE ? OR dep.nombre LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    query += ' ORDER BY t.updated_at DESC';

    const [tramites] = await connection.query(query, params);

    // Para cada trámite, obtener personas con propuestas
    for (let tramite of tramites) {
      const [personas] = await connection.query(
        `SELECT 
          p.*,
          pu_original.nombre as puesto_original_nombre,
          pu_propuesto.nombre as puesto_propuesto_nombre,
          pu_original.es_competencia_municipal as puesto_original_es_municipal,
          pu_propuesto.es_competencia_municipal as puesto_propuesto_es_municipal
        FROM personas_tramite_alta p
        LEFT JOIN puestos pu_original ON p.puesto_id = pu_original.id
        LEFT JOIN puestos pu_propuesto ON p.puesto_propuesto_c3_id = pu_propuesto.id
        WHERE p.tramite_alta_id = ?
        ORDER BY p.created_at ASC`,
        [tramite.id]
      );

      tramite.personas = personas;
      tramite.total_propuestas = personas.filter(p => p.tiene_propuesta_cambio).length;
    }

    res.json({
      success: true,
      data: tramites,
      total: tramites.length,
      message: `${tramites.length} trámites con propuestas de C3 encontrados`
    });

  } catch (error) {
    console.error('Error al obtener propuestas C3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener propuestas C3',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Emitir decisión final de C5 sobre propuestas de C3
 * C5 decide si acepta el puesto original o el propuesto por C3
 */
export const emitirDecisionFinalC5 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { tramite_id, decisiones } = req.body;

    // decisiones = [{ persona_id: 1, decision: 'original' o 'propuesta' }, ...]

    if (!decisiones || !Array.isArray(decisiones) || decisiones.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos una decisión'
      });
    }

    // Verificar que el trámite existe y está en revisión_propuesta_c3
    const [tramites] = await connection.query(
      'SELECT * FROM tramites_alta WHERE id = ? AND fase_actual = ? AND usuario_analista_c5_id = ?',
      [tramite_id, 'revision_propuesta_c3', req.userId]
    );

    if (tramites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Trámite no encontrado o no está en revisión de propuestas'
      });
    }

    let todasDecisionesTomadas = true;

    // Procesar cada decisión
    for (const decision of decisiones) {
      const { persona_id, decision: tipo_decision } = decision;

      if (!['original', 'propuesta'].includes(tipo_decision)) {
        return res.status(400).json({
          success: false,
          message: `Decisión inválida: ${tipo_decision}. Debe ser 'original' o 'propuesta'`
        });
      }

      // Obtener datos de la persona
      const [personas] = await connection.query(
        'SELECT * FROM personas_tramite_alta WHERE id = ? AND tramite_alta_id = ?',
        [persona_id, tramite_id]
      );

      if (personas.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Persona con ID ${persona_id} no encontrada en este trámite`
        });
      }

      const persona = personas[0];

      if (tipo_decision === 'propuesta') {
        // C5 acepta la propuesta de C3: cambiar puesto_id al propuesto
        if (!persona.puesto_propuesto_c3_id) {
          return res.status(400).json({
            success: false,
            message: `La persona ${persona_id} no tiene propuesta de cambio de puesto`
          });
        }

        await connection.query(
          `UPDATE personas_tramite_alta 
           SET puesto_id = puesto_propuesto_c3_id,
               decision_final_c5 = 'propuesta'
           WHERE id = ?`,
          [persona_id]
        );

      } else {
        // C5 mantiene el puesto original: solo marcar decisión
        await connection.query(
          `UPDATE personas_tramite_alta 
           SET decision_final_c5 = 'original'
           WHERE id = ?`,
          [persona_id]
        );
      }
    }

    // Verificar si todas las personas con propuestas tienen decisión
    const [personasPendientes] = await connection.query(
      `SELECT COUNT(*) as count 
       FROM personas_tramite_alta 
       WHERE tramite_alta_id = ? 
         AND tiene_propuesta_cambio = TRUE 
         AND decision_final_c5 = 'pendiente'`,
      [tramite_id]
    );

    if (personasPendientes[0].count > 0) {
      todasDecisionesTomadas = false;
    }

    // Si todas las decisiones están tomadas, cambiar fase del trámite
    let nuevaFase = 'revision_propuesta_c3'; // Mantener en revisión si faltan decisiones
    let mensaje = 'Decisiones parciales registradas. Aún quedan personas por decidir.';

    if (todasDecisionesTomadas) {
      nuevaFase = 'validado_c3'; // Continuar el proceso
      mensaje = 'Todas las decisiones registradas. Trámite aprobado con decisión final de C5.';

      // Actualizar fase del trámite
      await connection.query(
        `UPDATE tramites_alta 
         SET fase_actual = ?
         WHERE id = ?`,
        [nuevaFase, tramite_id]
      );

      // Registrar en historial
      await connection.query(
        `INSERT INTO historial_tramites_alta (
          tramite_alta_id, 
          usuario_id, 
          fase_anterior, 
          fase_nueva, 
          comentario
        ) VALUES (?, ?, 'revision_propuesta_c3', ?, ?)`,
        [tramite_id, req.userId, nuevaFase, 'C5 emitió decisión final sobre propuestas de C3']
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: mensaje,
      data: {
        tramite_id,
        decisiones_procesadas: decisiones.length,
        fase_nueva: nuevaFase,
        todas_decisiones_tomadas: todasDecisionesTomadas
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al emitir decisión final C5:', error);
    res.status(500).json({
      success: false,
      message: 'Error al emitir decisión final',
      error: error.message
    });
  } finally {
    connection.release();
  }
};
