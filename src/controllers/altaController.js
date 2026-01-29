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

// ============================================
// DASHBOARD PERSONALIZADO DE MUNICIPIOS
// ============================================

/**
 * DASHBOARD: Obtener municipios que el analista agregó a su dashboard
 * CORRECCIÓN: Solo muestra municipios agregados manualmente, NO todos
 */
export const obtenerDashboardMunicipios = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // Obtener información del analista
    const [usuario] = await connection.query(
      'SELECT id, nombre_completo, region_id FROM usuarios WHERE id = ? AND rol = ?',
      [req.userId, 'analista']
    );

    if (usuario.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Solo los analistas pueden acceder al dashboard de municipios'
      });
    }

    const analista = usuario[0];

    // Obtener SOLO los municipios que el analista agregó a su dashboard
    const [municipiosAgregados] = await connection.query(
      `SELECT 
        amd.id as dashboard_id,
        m.id as municipio_id,
        m.nombre as municipio_nombre,
        r.nombre as region_nombre,
        amd.created_at as fecha_agregado
       FROM analista_municipios_dashboard amd
       INNER JOIN municipios m ON amd.municipio_id = m.id
       INNER JOIN regiones r ON m.region_id = r.id
       WHERE amd.usuario_analista_id = ?
       ORDER BY amd.created_at DESC`,
      [req.userId]
    );

    // Para cada municipio agregado, obtener estadísticas
    const municipiosConEstadisticas = [];

    for (const municipio of municipiosAgregados) {
      // Obtener estadísticas de trámites
      const [stats] = await connection.query(
        `SELECT 
          COUNT(DISTINCT t.id) as total_tramites,
          COUNT(DISTINCT CASE WHEN t.fase_actual IN ('validado_c3', 'finalizado') THEN t.id END) as tramites_finalizados,
          COUNT(DISTINCT CASE WHEN t.fase_actual NOT IN ('validado_c3', 'finalizado', 'rechazado') THEN t.id END) as tramites_en_proceso,
          COUNT(p.id) as total_personas,
          SUM(CASE WHEN p.validado = TRUE AND p.rechazado = FALSE THEN 1 ELSE 0 END) as personas_validadas,
          SUM(CASE WHEN p.rechazado = TRUE THEN 1 ELSE 0 END) as personas_rechazadas,
          SUM(CASE WHEN p.validado = FALSE AND p.rechazado = FALSE THEN 1 ELSE 0 END) as personas_en_proceso
        FROM tramites_alta t
        LEFT JOIN personas_tramite_alta p ON p.tramite_alta_id = t.id
        WHERE t.municipio_id = ? AND t.usuario_analista_c5_id = ?`,
        [municipio.municipio_id, req.userId]
      );

      const estadisticas = stats[0];

      // Obtener el trámite más reciente
      const [ultimoTramite] = await connection.query(
        `SELECT id, numero_solicitud, fase_actual, updated_at
         FROM tramites_alta
         WHERE municipio_id = ? AND usuario_analista_c5_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [municipio.municipio_id, req.userId]
      );

      // Determinar estado visual
      let estadoVisual = 'gris';
      let estadoDescriptivo = 'Sin trámites';

      if (estadisticas.total_tramites > 0) {
        const todasFinalizadas = estadisticas.tramites_en_proceso === 0;
        const hayProceso = estadisticas.tramites_en_proceso > 0;

        if (todasFinalizadas && estadisticas.tramites_finalizados > 0) {
          estadoVisual = 'verde';
          estadoDescriptivo = 'Trámites finalizados correctamente';
        } else if (hayProceso) {
          estadoVisual = 'amarillo';
          estadoDescriptivo = 'En proceso de alta';
        }
      }

      const tieneTramites = estadisticas.total_tramites > 0;

      municipiosConEstadisticas.push({
        dashboard_id: municipio.dashboard_id,
        municipio_id: municipio.municipio_id,
        municipio_nombre: municipio.municipio_nombre,
        region_nombre: municipio.region_nombre,
        estado_visual: estadoVisual,
        estado_descriptivo: estadoDescriptivo,
        estadisticas: {
          total_tramites: estadisticas.total_tramites,
          tramites_finalizados: estadisticas.tramites_finalizados,
          tramites_en_proceso: estadisticas.tramites_en_proceso,
          total_personas: estadisticas.total_personas,
          validados: estadisticas.personas_validadas,
          rechazados: estadisticas.personas_rechazadas,
          en_proceso: estadisticas.personas_en_proceso
        },
        ultimo_tramite: ultimoTramite.length > 0 ? {
          id: ultimoTramite[0].id,
          numero_solicitud: ultimoTramite[0].numero_solicitud,
          fase_actual: ultimoTramite[0].fase_actual,
          fecha_actualizacion: ultimoTramite[0].updated_at
        } : null,
        acciones: {
          boton_principal: tieneTramites ? 'ver_proceso' : 'iniciar_proceso',
          puede_iniciar: !tieneTramites,
          puede_ver_proceso: tieneTramites,
          puede_ver_detalles: true,
          puede_eliminar: !tieneTramites // Solo puede eliminar si NO tiene trámites
        }
      });
    }

    res.json({
      success: true,
      data: {
        analista: {
          id: analista.id,
          nombre: analista.nombre_completo,
          region_id: analista.region_id
        },
        municipios: municipiosConEstadisticas,
        total_municipios: municipiosConEstadisticas.length,
        resumen_general: {
          municipios_sin_tramites: municipiosConEstadisticas.filter(m => m.estado_visual === 'gris').length,
          municipios_en_proceso: municipiosConEstadisticas.filter(m => m.estado_visual === 'amarillo').length,
          municipios_finalizados: municipiosConEstadisticas.filter(m => m.estado_visual === 'verde').length
        }
      },
      message: municipiosConEstadisticas.length === 0 
        ? 'Dashboard vacío. Agrega municipios con el botón +' 
        : `Dashboard cargado: ${municipiosConEstadisticas.length} municipio(s)`
    });

  } catch (error) {
    console.error('Error al obtener dashboard de municipios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dashboard de municipios',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Obtener catálogo de municipios disponibles para agregar al dashboard
 * SOLO muestra municipios de la región del analista que AÚN NO agregó
 */
export const obtenerMunicipiosDisponibles = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [usuario] = await connection.query(
      'SELECT id, region_id FROM usuarios WHERE id = ? AND rol = ?',
      [req.userId, 'analista']
    );

    if (usuario.length === 0 || !usuario[0].region_id) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no tiene región asignada'
      });
    }

    // Obtener municipios de la región que NO están en el dashboard
    const [municipiosDisponibles] = await connection.query(
      `SELECT 
        m.id as municipio_id,
        m.nombre as municipio_nombre,
        r.nombre as region_nombre
       FROM municipios m
       INNER JOIN regiones r ON m.region_id = r.id
       WHERE m.region_id = ?
         AND m.id NOT IN (
           SELECT municipio_id 
           FROM analista_municipios_dashboard 
           WHERE usuario_analista_id = ?
         )
       ORDER BY m.nombre ASC`,
      [usuario[0].region_id, req.userId]
    );

    res.json({
      success: true,
      data: municipiosDisponibles,
      total: municipiosDisponibles.length,
      message: `${municipiosDisponibles.length} municipio(s) disponible(s) para agregar`
    });

  } catch (error) {
    console.error('Error al obtener municipios disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener municipios disponibles',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Agregar un municipio al dashboard del analista
 * REGLA: Solo municipios de su región
 */
export const agregarMunicipioDashboard = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { municipio_id } = req.body;

    if (!municipio_id) {
      return res.status(400).json({
        success: false,
        message: 'El ID del municipio es requerido'
      });
    }

    // Verificar que el analista existe y obtener su región
    const [usuario] = await connection.query(
      'SELECT id, region_id FROM usuarios WHERE id = ? AND rol = ?',
      [req.userId, 'analista']
    );

    if (usuario.length === 0 || !usuario[0].region_id) {
      return res.status(403).json({
        success: false,
        message: 'Usuario no válido o sin región asignada'
      });
    }

    // Verificar que el municipio existe y pertenece a la región del analista
    const [municipio] = await connection.query(
      `SELECT m.id, m.nombre, r.nombre as region_nombre
       FROM municipios m
       INNER JOIN regiones r ON m.region_id = r.id
       WHERE m.id = ? AND m.region_id = ?`,
      [municipio_id, usuario[0].region_id]
    );

    if (municipio.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Municipio no encontrado o no pertenece a tu región'
      });
    }

    // Verificar que no esté ya agregado
    const [yaExiste] = await connection.query(
      'SELECT id FROM analista_municipios_dashboard WHERE usuario_analista_id = ? AND municipio_id = ?',
      [req.userId, municipio_id]
    );

    if (yaExiste.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este municipio ya está en tu dashboard'
      });
    }

    // Agregar al dashboard
    const [result] = await connection.query(
      'INSERT INTO analista_municipios_dashboard (usuario_analista_id, municipio_id) VALUES (?, ?)',
      [req.userId, municipio_id]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Municipio "${municipio[0].nombre}" agregado al dashboard`,
      data: {
        dashboard_id: result.insertId,
        municipio_id: municipio[0].id,
        municipio_nombre: municipio[0].nombre,
        region_nombre: municipio[0].region_nombre
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al agregar municipio al dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar municipio al dashboard',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Eliminar un municipio del dashboard
 * REGLA: Solo si NO tiene trámites iniciados
 */
export const eliminarMunicipioDashboard = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { dashboard_id } = req.params;

    // Verificar que el registro existe y pertenece al analista
    const [dashboard] = await connection.query(
      `SELECT amd.id, amd.municipio_id, m.nombre as municipio_nombre
       FROM analista_municipios_dashboard amd
       INNER JOIN municipios m ON amd.municipio_id = m.id
       WHERE amd.id = ? AND amd.usuario_analista_id = ?`,
      [dashboard_id, req.userId]
    );

    if (dashboard.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Municipio no encontrado en tu dashboard'
      });
    }

    const municipioId = dashboard[0].municipio_id;

    // Verificar que NO tenga trámites iniciados
    const [tramites] = await connection.query(
      'SELECT COUNT(*) as total FROM tramites_alta WHERE municipio_id = ? AND usuario_analista_c5_id = ?',
      [municipioId, req.userId]
    );

    if (tramites[0].total > 0) {
      return res.status(400).json({
        success: false,
        message: '⚠️ No puedes eliminar este municipio porque ya tiene trámites iniciados',
        detalles: {
          municipio: dashboard[0].municipio_nombre,
          total_tramites: tramites[0].total
        }
      });
    }

    // Eliminar del dashboard
    await connection.query(
      'DELETE FROM analista_municipios_dashboard WHERE id = ?',
      [dashboard_id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Municipio "${dashboard[0].municipio_nombre}" eliminado del dashboard`
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar municipio del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar municipio del dashboard',
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

    // Obtener información del usuario actual
    const [usuario] = await connection.query(
      'SELECT rol FROM usuarios WHERE id = ?',
      [req.userId]
    );

    // Construir query según el rol
    let whereClause;
    let queryParams;
    
    if (usuario[0]?.rol === 'validador_c3') {
      // C3 puede ver trámites en fases específicas
      whereClause = 't.id = ? AND t.fase_actual IN (?, ?, ?, ?)';
      queryParams = [id, 'enviado_c3', 'validado_c3', 'revision_propuesta_c3', 'rechazado'];
    } else {
      // Analistas solo ven sus propios trámites
      whereClause = 't.id = ? AND t.usuario_analista_c5_id = ?';
      queryParams = [id, req.userId];
    }

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
      WHERE ${whereClause}`,
      queryParams
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada o no tienes permisos'
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
 * PASO 3: Ver PERSONAS pendientes para C3 (Vista por persona individual)
 * C3 ve tabla de personas, no de trámites
 */
export const obtenerPersonasPendientesC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { busqueda } = req.query;

    let query = `
      SELECT 
        p.*,
        t.numero_solicitud,
        t.fecha_solicitud,
        t.fase_actual as tramite_fase,
        CONCAT(p.nombre, ' ', p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) as nombre_completo,
        pu.nombre as puesto_nombre,
        pu.es_competencia_municipal,
        pu_propuesto.nombre as puesto_propuesto_nombre,
        m.nombre as municipio_nombre,
        dep.nombre as dependencia_nombre,
        ua.nombre_completo as analista_nombre
      FROM personas_tramite_alta p
      INNER JOIN tramites_alta t ON p.tramite_alta_id = t.id
      LEFT JOIN puestos pu ON p.puesto_id = pu.id
      LEFT JOIN puestos pu_propuesto ON p.puesto_propuesto_c3_id = pu_propuesto.id
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN dependencias dep ON t.dependencia_id = dep.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      WHERE t.fase_actual IN ('enviado_c3', 'revision_propuesta_c3')
        AND p.rechazado = FALSE
        AND p.validado = TRUE
    `;

    const params = [];

    if (busqueda) {
      query += ` AND (
        p.nombre LIKE ? OR 
        p.apellido_paterno LIKE ? OR 
        p.apellido_materno LIKE ? OR
        t.numero_solicitud LIKE ?
      )`;
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY t.created_at ASC, p.created_at ASC';

    const [personas] = await connection.query(query, params);

    res.json({
      success: true,
      data: personas,
      total: personas.length,
      message: `${personas.length} personas pendientes de dictamen C3`
    });

  } catch (error) {
    console.error('Error al obtener personas pendientes C3:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener personas pendientes',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Obtener detalle de una solicitud para C3
 * Permite a C3 ver cualquier solicitud enviada para validación
 * SOLO muestra personas NO rechazadas
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

    // Obtener personas del trámite - MOSTRAR TODAS para contexto
    const [personas] = await connection.query(
      `SELECT 
        p.*,
        pu.nombre as puesto_nombre,
        pu.es_competencia_municipal,
        pu.motivo_no_competencia,
        pu_propuesto.nombre as puesto_propuesto_nombre
      FROM personas_tramite_alta p
      LEFT JOIN puestos pu ON p.puesto_id = pu.id
      LEFT JOIN puestos pu_propuesto ON p.puesto_propuesto_c3_id = pu_propuesto.id
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

/**
 * DEBUG: Ver estado de dictámenes de un trámite
 */
export const debugTramiteEstado = async (req, res) => {
  try {
    const { tramite_id } = req.params;

    const [tramite] = await pool.query(
      'SELECT id, numero_solicitud, fase_actual FROM tramites_alta WHERE id = ?',
      [tramite_id]
    );

    if (tramite.length === 0) {
      return res.status(404).json({ success: false, message: 'Trámite no encontrado' });
    }

    const [personas] = await pool.query(
      `SELECT id, nombre, apellido_paterno, validado, rechazado, 
              tiene_propuesta_cambio, observaciones_c3, puesto_propuesto_c3_id,
              decision_final_c5
       FROM personas_tramite_alta 
       WHERE tramite_alta_id = ?`,
      [tramite_id]
    );

    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as total_personas,
        SUM(CASE WHEN validado = TRUE THEN 1 ELSE 0 END) as validadas_c5,
        SUM(CASE WHEN rechazado = TRUE THEN 1 ELSE 0 END) as rechazadas_total,
        SUM(CASE WHEN validado = TRUE AND (tiene_propuesta_cambio = TRUE OR observaciones_c3 IS NOT NULL OR rechazado = TRUE) THEN 1 ELSE 0 END) as dictaminadas_c3
      FROM personas_tramite_alta
      WHERE tramite_alta_id = ?`,
      [tramite_id]
    );

    res.json({
      success: true,
      data: {
        tramite: tramite[0],
        personas,
        estadisticas: stats[0],
        criterio_cambio_fase: {
          todas_dictaminadas: stats[0].validadas_c5 === stats[0].dictaminadas_c3,
          personas_c5_valido: stats[0].validadas_c5,
          personas_c3_dictamino: stats[0].dictaminadas_c3
        }
      }
    });

  } catch (error) {
    console.error('Error debug tramite:', error);
    res.status(500).json({ success: false, message: 'Error en debug' });
  }
};

/**
 * C3 emite dictamen para UNA PERSONA individual
 * No para el trámite completo
 */
export const emitirDictamenPersonaC3 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { persona_id } = req.params;
    const { estatus, observaciones_c3, puesto_propuesto_id } = req.body;

    // Validar estatus
    const estatusPermitidos = ['ALTA OK', 'NO PUEDE SER DADO DE ALTA', 'PENDIENTE'];
    if (!estatusPermitidos.includes(estatus)) {
      return res.status(400).json({
        success: false,
        message: 'Estatus inválido. Use: ALTA OK, NO PUEDE SER DADO DE ALTA, o PENDIENTE'
      });
    }

    // Verificar que la persona existe y pertenece a un trámite en fase correcta
    const [personas] = await connection.query(
      `SELECT p.*, t.fase_actual, t.id as tramite_id
       FROM personas_tramite_alta p
       INNER JOIN tramites_alta t ON p.tramite_alta_id = t.id
       WHERE p.id = ? AND t.fase_actual IN ('enviado_c3', 'revision_propuesta_c3')`,
      [persona_id]
    );

    if (personas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada o el trámite no está en fase de validación C3'
      });
    }

    const persona = personas[0];

    // Aplicar dictamen
    if (estatus === 'ALTA OK') {
      // Si tiene propuesta de puesto, marcar como propuesta
      if (puesto_propuesto_id) {
        await connection.query(
          `UPDATE personas_tramite_alta 
           SET validado = TRUE,
               rechazado = FALSE,
               puesto_propuesto_c3_id = ?,
               tiene_propuesta_cambio = TRUE,
               decision_final_c5 = 'pendiente',
               observaciones_c3 = ?
           WHERE id = ?`,
          [puesto_propuesto_id, observaciones_c3 || 'Propuesta de cambio de puesto', persona_id]
        );
      } else {
        // Sin propuesta, solo validar
        await connection.query(
          `UPDATE personas_tramite_alta 
           SET validado = TRUE,
               rechazado = FALSE,
               observaciones_c3 = ?
           WHERE id = ?`,
          [observaciones_c3 || null, persona_id]
        );
      }
      
      // Actualizar el validador C3 en el trámite
      await connection.query(
        'UPDATE tramites_alta SET usuario_validador_c3_id = ? WHERE id = ?',
        [req.userId, persona.tramite_id]
      );

    } else if (estatus === 'NO PUEDE SER DADO DE ALTA') {
      // Rechazar persona - MANTENER validado = TRUE porque C5 SÍ lo validó
      await connection.query(
        `UPDATE personas_tramite_alta 
         SET validado = TRUE,
             rechazado = TRUE, 
             motivo_rechazo = ?
         WHERE id = ?`,
        [observaciones_c3 || 'Rechazado por C3', persona_id]
      );
    }
    // Si es PENDIENTE, no se hace nada (queda sin validar ni rechazar)

    // Verificar si todas las personas QUE C5 VALIDÓ ya fueron dictaminadas por C3
    // Solo contamos personas con validado=TRUE inicial (las que C5 aprobó y envió a C3)
    // Las personas con validado=FALSE son rechazos de C5, nunca llegan a C3
    const [stats] = await connection.query(
      `SELECT 
        COUNT(*) as total,
        CAST(SUM(CASE WHEN tiene_propuesta_cambio = TRUE OR observaciones_c3 IS NOT NULL OR rechazado = TRUE THEN 1 ELSE 0 END) AS UNSIGNED) as dictaminadas,
        CAST(SUM(CASE WHEN tiene_propuesta_cambio = TRUE AND rechazado = FALSE THEN 1 ELSE 0 END) AS UNSIGNED) as con_propuestas,
        CAST(SUM(CASE WHEN rechazado = FALSE THEN 1 ELSE 0 END) AS UNSIGNED) as no_rechazadas
      FROM personas_tramite_alta
      WHERE tramite_alta_id = ? AND validado = TRUE`,
      [persona.tramite_id]
    );

    const allDictaminadas = Number(stats[0].total) === Number(stats[0].dictaminadas);
    const hayPropuestas = stats[0].con_propuestas > 0;
    const todasRechazadas = stats[0].no_rechazadas === 0;

    // DEBUG: Ver qué está contando
    console.log('🔍 DEBUG DICTAMEN C3:', {
      tramite_id: persona.tramite_id,
      total_personas_validadas_c5: stats[0].total,
      dictaminadas_por_c3: stats[0].dictaminadas,
      con_propuestas: stats[0].con_propuestas,
      no_rechazadas: stats[0].no_rechazadas,
      allDictaminadas,
      hayPropuestas,
      todasRechazadas
    });

    let nuevaFase = null;

    if (allDictaminadas) {
      if (todasRechazadas) {
        // Si todas fueron rechazadas, marcar trámite como rechazado
        nuevaFase = 'rechazado';
      } else if (hayPropuestas) {
        // Si hay propuestas (y no todas rechazadas), enviar a revisión C5
        nuevaFase = 'revision_propuesta_c3';
      } else {
        // Si todas aprobadas sin propuestas, marcar como validado
        nuevaFase = 'validado_c3';
      }
      
      await connection.query(
        'UPDATE tramites_alta SET fase_actual = ? WHERE id = ?',
        [nuevaFase, persona.tramite_id]
      );

      let comentarioHistorial = 'Todas las personas dictaminadas por C3';
      if (todasRechazadas) {
        comentarioHistorial = 'Todas las personas rechazadas por C3';
      } else if (hayPropuestas) {
        comentarioHistorial = `Dictamen C3 completado - ${stats[0].con_propuestas} propuesta(s) de cambio de puesto`;
      }

      await connection.query(
        `INSERT INTO historial_tramites_alta (
          tramite_alta_id, usuario_id, fase_anterior, fase_nueva, comentario
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          persona.tramite_id, 
          req.userId, 
          persona.fase_actual, // Usar la fase anterior del trámite
          nuevaFase,
          comentarioHistorial
        ]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Dictamen registrado para persona ${persona_id}`,
      data: {
        persona_id,
        estatus,
        tiene_propuesta: !!puesto_propuesto_id,
        tramite_completo: allDictaminadas,
        fase_nueva: nuevaFase || persona.fase_actual
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al emitir dictamen persona C3:', error);
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
      query += ' AND (t.numero_solicitud LIKE ? OR m.nombre LIKE ? OR dep.nombre LIKE ? OR ua.nombre_completo LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
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
 * C5 obtiene TODAS las personas de TODOS los trámites
 * Vista unificada para ver el estatus de cada persona
 */
export const obtenerTodasLasPersonasC5 = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { busqueda, fase_tramite, estatus_persona } = req.query;

    let query = `
      SELECT 
        p.*,
        CONCAT(p.nombre, ' ', p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) as nombre_completo,
        t.numero_solicitud,
        t.fase_actual as tramite_fase,
        t.fecha_solicitud,
        t.usuario_analista_c5_id,
        pu.nombre as puesto_original_nombre,
        pu.es_competencia_municipal as puesto_original_es_municipal,
        pu_propuesto.nombre as puesto_propuesto_nombre,
        pu_propuesto.es_competencia_municipal as puesto_propuesto_es_municipal,
        m.nombre as municipio_nombre,
        dep.nombre as dependencia_nombre,
        ua.nombre_completo as analista_nombre,
        uv.nombre_completo as validador_c3_nombre,
        CASE 
          WHEN p.validado = TRUE AND p.tiene_propuesta_cambio = FALSE THEN 'Aprobado por C3'
          WHEN p.validado = TRUE AND p.tiene_propuesta_cambio = TRUE AND p.decision_final_c5 = 'propuesta' THEN 'Aprobado con cambio (C5 aceptó)'
          WHEN p.validado = TRUE AND p.tiene_propuesta_cambio = TRUE AND p.decision_final_c5 = 'original' THEN 'Aprobado sin cambio (C5 rechazó propuesta)'
          WHEN p.validado = TRUE AND p.tiene_propuesta_cambio = TRUE AND p.decision_final_c5 = 'pendiente' THEN 'Aprobado con propuesta (Pendiente decisión C5)'
          WHEN p.rechazado = TRUE THEN 'Rechazado'
          WHEN t.fase_actual = 'enviado_c3' THEN 'Pendiente dictamen C3'
          WHEN t.fase_actual = 'datos_solicitud' THEN 'En captura'
          WHEN t.fase_actual = 'validacion_personal' THEN 'En validación C5'
          ELSE 'Pendiente'
        END as estatus_descriptivo
      FROM personas_tramite_alta p
      INNER JOIN tramites_alta t ON p.tramite_alta_id = t.id
      LEFT JOIN puestos pu ON p.puesto_id = pu.id
      LEFT JOIN puestos pu_propuesto ON p.puesto_propuesto_c3_id = pu_propuesto.id
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN dependencias dep ON t.dependencia_id = dep.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      LEFT JOIN usuarios uv ON t.usuario_validador_c3_id = uv.id
      WHERE 1=1
    `;

    const params = [];

    // Filtrar solo los trámites del analista actual
    query += ' AND t.usuario_analista_c5_id = ?';
    params.push(req.userId);

    if (busqueda) {
      query += ` AND (
        p.nombre LIKE ? OR 
        p.apellido_paterno LIKE ? OR 
        p.apellido_materno LIKE ? OR
        t.numero_solicitud LIKE ?
      )`;
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (fase_tramite) {
      query += ' AND t.fase_actual = ?';
      params.push(fase_tramite);
    }

    if (estatus_persona) {
      if (estatus_persona === 'validado') {
        query += ' AND p.validado = TRUE';
      } else if (estatus_persona === 'rechazado') {
        query += ' AND p.rechazado = TRUE';
      } else if (estatus_persona === 'pendiente') {
        query += ' AND p.validado = FALSE AND p.rechazado = FALSE';
      }
    }

    query += ' ORDER BY t.created_at DESC, p.created_at ASC';

    const [personas] = await connection.query(query, params);

    res.json({
      success: true,
      data: personas,
      total: personas.length,
      message: `${personas.length} personas encontradas`
    });

  } catch (error) {
    console.error('Error al obtener personas C5:', error);
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
// TABLA DE PERSONAS RECHAZADAS (C5 y C3)
// ============================================

/**
 * Obtener TODAS las PERSONAS rechazadas (no trámites)
 * Vista por persona individual - Historial completo de rechazos
 * Visible para C5 y C3
 */
export const obtenerPersonasRechazadas = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { fecha_inicio, fecha_fin, busqueda, etapa_rechazo } = req.query;

    // Obtener rol del usuario
    const [usuario] = await connection.query(
      'SELECT rol FROM usuarios WHERE id = ?',
      [req.userId]
    );

    let query = `
      SELECT 
        p.id,
        p.nombre,
        p.apellido_paterno,
        p.apellido_materno,
        CONCAT(p.nombre, ' ', p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) as nombre_completo,
        p.fecha_nacimiento,
        p.numero_oficio_c3,
        p.motivo_rechazo,
        p.observaciones_c3,
        p.created_at,
        p.updated_at,
        p.tramite_alta_id,
        t.numero_solicitud,
        t.fase_actual as fase_tramite,
        t.fecha_solicitud,
        pu.nombre as puesto_solicitado,
        pu.es_competencia_municipal,
        pu.motivo_no_competencia,
        m.nombre as municipio_nombre,
        r.nombre as region_nombre,
        dep.nombre as dependencia_nombre,
        ua.nombre_completo as analista_nombre,
        uv.nombre_completo as validador_c3_nombre,
        CASE 
          WHEN pu.es_competencia_municipal = FALSE THEN 'Validación de Personal (Filtro Automático de Competencia)'
          WHEN p.observaciones_c3 IS NOT NULL AND p.rechazado = TRUE THEN 'Dictamen C3'
          WHEN p.motivo_rechazo IS NOT NULL AND pu.es_competencia_municipal = TRUE THEN 'Validación de Personal (Rechazo Manual C5)'
          ELSE 'Otro proceso'
        END as etapa_rechazo_descriptiva,
        CASE 
          WHEN pu.es_competencia_municipal = FALSE THEN pu.motivo_no_competencia
          WHEN p.observaciones_c3 IS NOT NULL THEN p.observaciones_c3
          ELSE p.motivo_rechazo
        END as motivo_especifico
      FROM personas_tramite_alta p
      INNER JOIN tramites_alta t ON p.tramite_alta_id = t.id
      LEFT JOIN puestos pu ON p.puesto_id = pu.id
      LEFT JOIN municipios m ON t.municipio_id = m.id
      LEFT JOIN regiones r ON m.region_id = r.id
      LEFT JOIN dependencias dep ON t.dependencia_id = dep.id
      LEFT JOIN usuarios ua ON t.usuario_analista_c5_id = ua.id
      LEFT JOIN usuarios uv ON t.usuario_validador_c3_id = uv.id
      WHERE p.rechazado = TRUE
    `;

    const params = [];

    // Filtro de privacidad según rol
    if (usuario[0]?.rol === 'analista') {
      // C5 solo ve sus propios rechazos
      query += ' AND t.usuario_analista_c5_id = ?';
      params.push(req.userId);
    } else if (usuario[0]?.rol === 'validador_c3') {
      // C3 ve rechazos de trámites que procesó
      query += ' AND (t.usuario_validador_c3_id = ? OR t.usuario_validador_c3_id IS NULL)';
      params.push(req.userId);
    }

    if (fecha_inicio && fecha_fin) {
      query += ' AND p.updated_at BETWEEN ? AND ?';
      params.push(fecha_inicio, fecha_fin);
    }

    if (busqueda) {
      query += ` AND (
        p.nombre LIKE ? OR 
        p.apellido_paterno LIKE ? OR 
        p.apellido_materno LIKE ? OR
        t.numero_solicitud LIKE ? OR
        m.nombre LIKE ? OR
        dep.nombre LIKE ?
      )`;
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (etapa_rechazo) {
      if (etapa_rechazo === 'competencia') {
        query += ' AND pu.es_competencia_municipal = FALSE';
      } else if (etapa_rechazo === 'c3') {
        query += ' AND t.fase_actual = ?';
        params.push('rechazado');
      } else if (etapa_rechazo === 'c5') {
        query += ' AND t.fase_actual = ? AND pu.es_competencia_municipal = TRUE';
        params.push('validacion_personal');
      }
    }

    query += ' ORDER BY p.updated_at DESC';

    const [personas] = await connection.query(query, params);

    // Para cada persona, construir documentación detallada
    for (let persona of personas) {
      const fecha = new Date(persona.updated_at);
      
      persona.documentacion_detallada = {
        nombre_completo: persona.nombre_completo,
        puesto_solicitado: persona.puesto_solicitado,
        numero_solicitud: persona.numero_solicitud,
        etapa_rechazo: persona.etapa_rechazo_descriptiva,
        motivo_especifico: persona.motivo_especifico || persona.motivo_rechazo || 'Sin especificar',
        fecha_completa: fecha.toLocaleDateString('es-MX', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        hora: fecha.toLocaleTimeString('es-MX'),
        fecha_iso: persona.updated_at,
        proceso: `Trámite ${persona.numero_solicitud} - ${persona.dependencia_nombre} - ${persona.municipio_nombre}`,
        observaciones_completas: persona.observaciones_c3 || persona.motivo_rechazo || 'Sin observaciones adicionales',
        analista_responsable: persona.analista_nombre,
        validador_c3: persona.validador_c3_nombre || 'No asignado',
        region: persona.region_nombre,
        // Texto formateado para copiar
        texto_copiable: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 REGISTRO DE PERSONA RECHAZADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 ELEMENTO: ${persona.nombre_completo}
📄 TRÁMITE: ${persona.numero_solicitud}
🏛️ DEPENDENCIA: ${persona.dependencia_nombre}
🌎 MUNICIPIO: ${persona.municipio_nombre} (${persona.region_nombre})

⚠️ ETAPA DE RECHAZO:
   ${persona.etapa_rechazo_descriptiva}

📝 MOTIVO ESPECÍFICO:
   ${persona.motivo_especifico || persona.motivo_rechazo || 'Sin especificar'}

💼 PUESTO SOLICITADO: ${persona.puesto_solicitado}
${persona.es_competencia_municipal === false ? '   ⚠️ PUESTO FUERA DE COMPETENCIA MUNICIPAL' : ''}

📅 FECHA DE RECHAZO: ${fecha.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
🕐 HORA: ${fecha.toLocaleTimeString('es-MX')}

👨‍💼 ANALISTA C5: ${persona.analista_nombre}
${persona.validador_c3_nombre ? `👨‍⚖️ VALIDADOR C3: ${persona.validador_c3_nombre}` : ''}

📋 OBSERVACIONES COMPLETAS:
   ${persona.observaciones_c3 || persona.motivo_rechazo || 'Sin observaciones adicionales'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim()
      };
    }

    res.json({
      success: true,
      data: personas,
      total: personas.length,
      message: `${personas.length} persona(s) rechazada(s) encontrada(s)`
    });

  } catch (error) {
    console.error('Error al obtener personas rechazadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener personas rechazadas',
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
      query += ' AND (t.numero_solicitud LIKE ? OR m.nombre LIKE ? OR dep.nombre LIKE ? OR r.nombre LIKE ? OR uv.nombre_completo LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
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

        // ⚠️ SEGUNDO FILTRO DE COMPETENCIA: Validar que el puesto propuesto sea de competencia municipal
        const [puestoPropuesto] = await connection.query(
          'SELECT id, nombre, es_competencia_municipal, motivo_no_competencia FROM puestos WHERE id = ?',
          [persona.puesto_propuesto_c3_id]
        );

        if (puestoPropuesto.length === 0) {
          return res.status(404).json({
            success: false,
            message: `El puesto propuesto no existe`
          });
        }

        // Si el puesto propuesto NO es de competencia municipal, BLOQUEAR la decisión
        if (puestoPropuesto[0].es_competencia_municipal === false || puestoPropuesto[0].es_competencia_municipal === 0) {
          return res.status(400).json({
            success: false,
            message: '⚠️ PUESTO NO CORRESPONDE: No puede aceptar un puesto fuera de competencia municipal',
            detalles: {
              puesto_propuesto: puestoPropuesto[0].nombre,
              motivo: puestoPropuesto[0].motivo_no_competencia || 'Puesto fuera de competencia de C5',
              accion_requerida: 'Debe seleccionar el puesto original o rechazar la persona'
            }
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
