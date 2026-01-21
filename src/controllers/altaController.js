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
      dependencia,
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
        dependencia,
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
        dependencia,
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
        ua.nombre_completo as analista_nombre,
        uv.nombre_completo as validador_c3_nombre
      FROM tramites_alta t
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN tipos_oficio tipo_ofi ON t.tipo_oficio_id = tipo_ofi.id
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
      query += ' AND (t.numero_solicitud LIKE ? OR t.dependencia LIKE ?)';
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
        ua.nombre_completo as analista_nombre,
        uv.nombre_completo as validador_c3_nombre
      FROM tramites_alta t
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN tipos_oficio tipo_ofi ON t.tipo_oficio_id = tipo_ofi.id
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
        ua.nombre_completo as analista_nombre,
        ua.extension as analista_extension
      FROM tramites_alta t
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN tipos_oficio tipo_ofi ON t.tipo_oficio_id = tipo_ofi.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      WHERE t.fase_actual = 'enviado_c3'
      ORDER BY t.created_at ASC`
    );

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

export const emitirDictamenC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { tramite_id, dictamen, observaciones_c3 } = req.body;

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

    let nuevaFase;
    if (dictamen === 'ALTA OK' || dictamen === 'APROBADO') {
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
    await connection.query(
      `INSERT INTO historial_tramites_alta (
        tramite_alta_id, 
        usuario_id, 
        fase_anterior, 
        fase_nueva, 
        comentario
      ) VALUES (?, ?, 'enviado_c3', ?, ?)`,
      [tramite_id, req.userId, nuevaFase, `Dictamen C3: ${dictamen}`]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Dictamen C3 registrado exitosamente',
      data: {
        tramite_id,
        dictamen,
        fase_nueva: nuevaFase
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
