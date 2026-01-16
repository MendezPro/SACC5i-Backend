import pool from '../config/database.js';

// Generar número de solicitud único
const generateSolicitudNumber = async (connection) => {
  const year = new Date().getFullYear();
  const [result] = await connection.query(
    'SELECT COUNT(*) as total FROM solicitudes WHERE YEAR(created_at) = ?',
    [year]
  );
  
  const sequential = (result[0].total + 1).toString().padStart(6, '0');
  return `SACC5I-${year}-${sequential}`;
};

// Obtener todas las solicitudes del usuario
export const getSolicitudes = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { estatus, tipo_oficio, fecha_inicio, fecha_fin, busqueda } = req.query;
    
    let query = `
      SELECT 
        s.*,
        e.nombre as estatus_nombre,
        e.color as estatus_color,
        t.nombre as tipo_oficio_nombre,
        m.nombre as municipio_nombre,
        u.nombre_completo as usuario_nombre
      FROM solicitudes s
      LEFT JOIN estatus_solicitudes e ON s.estatus_id = e.id
      LEFT JOIN tipos_oficio t ON s.tipo_oficio_id = t.id
      LEFT JOIN municipios m ON s.municipio_id = m.id
      LEFT JOIN usuarios u ON s.usuario_id = u.id
      WHERE s.usuario_id = ?
    `;
    
    const params = [req.userId];

    // Filtros opcionales
    if (estatus) {
      query += ' AND s.estatus_id = ?';
      params.push(estatus);
    }

    if (tipo_oficio) {
      query += ' AND s.tipo_oficio_id = ?';
      params.push(tipo_oficio);
    }

    if (fecha_inicio && fecha_fin) {
      query += ' AND s.fecha_solicitud BETWEEN ? AND ?';
      params.push(fecha_inicio, fecha_fin);
    }

    if (busqueda) {
      query += ' AND (s.numero_solicitud LIKE ? OR s.proceso_movimiento LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }

    query += ' ORDER BY s.created_at DESC';

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

// Obtener una solicitud específica
export const getSolicitudById = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    const [solicitudes] = await connection.query(
      `SELECT 
        s.*,
        e.nombre as estatus_nombre,
        e.color as estatus_color,
        t.nombre as tipo_oficio_nombre,
        m.nombre as municipio_nombre,
        u.nombre_completo as usuario_nombre
      FROM solicitudes s
      LEFT JOIN estatus_solicitudes e ON s.estatus_id = e.id
      LEFT JOIN tipos_oficio t ON s.tipo_oficio_id = t.id
      LEFT JOIN municipios m ON s.municipio_id = m.id
      LEFT JOIN usuarios u ON s.usuario_id = u.id
      WHERE s.id = ? AND s.usuario_id = ?`,
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
        u.nombre_completo as usuario_nombre,
        ea.nombre as estatus_anterior_nombre,
        en.nombre as estatus_nuevo_nombre
      FROM historial_solicitudes h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN estatus_solicitudes ea ON h.estatus_anterior_id = ea.id
      LEFT JOIN estatus_solicitudes en ON h.estatus_nuevo_id = en.id
      WHERE h.solicitud_id = ?
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

// Crear nueva solicitud
export const createSolicitud = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      tipo_oficio_id,
      municipio_id,
      region,
      proceso_movimiento,
      termino,
      dias_horas,
      fecha_sello_c5,
      fecha_recibido_dt,
      fecha_solicitud,
      observaciones
    } = req.body;

    // Generar número de solicitud
    const numero_solicitud = await generateSolicitudNumber(connection);

    // Insertar solicitud
    const [result] = await connection.query(
      `INSERT INTO solicitudes (
        numero_solicitud,
        usuario_id,
        tipo_oficio_id,
        municipio_id,
        region,
        proceso_movimiento,
        termino,
        dias_horas,
        fecha_sello_c5,
        fecha_recibido_dt,
        fecha_solicitud,
        observaciones,
        estatus_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        numero_solicitud,
        req.userId,
        tipo_oficio_id,
        municipio_id,
        region,
        proceso_movimiento,
        termino,
        dias_horas,
        fecha_sello_c5,
        fecha_recibido_dt,
        fecha_solicitud,
        observaciones
      ]
    );

    // Registrar en historial
    await connection.query(
      `INSERT INTO historial_solicitudes (
        solicitud_id,
        usuario_id,
        estatus_nuevo_id,
        comentario
      ) VALUES (?, ?, 1, 'Solicitud creada')`,
      [result.insertId, req.userId]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Solicitud creada exitosamente',
      data: {
        id: result.insertId,
        numero_solicitud
      }
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

// Actualizar solicitud
export const updateSolicitud = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const {
      tipo_oficio_id,
      municipio_id,
      region,
      proceso_movimiento,
      termino,
      dias_horas,
      fecha_sello_c5,
      fecha_recibido_dt,
      observaciones
    } = req.body;

    // Verificar que la solicitud pertenece al usuario
    const [solicitudes] = await connection.query(
      'SELECT id FROM solicitudes WHERE id = ? AND usuario_id = ?',
      [id, req.userId]
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    await connection.query(
      `UPDATE solicitudes SET
        tipo_oficio_id = ?,
        municipio_id = ?,
        region = ?,
        proceso_movimiento = ?,
        termino = ?,
        dias_horas = ?,
        fecha_sello_c5 = ?,
        fecha_recibido_dt = ?,
        observaciones = ?
      WHERE id = ?`,
      [
        tipo_oficio_id,
        municipio_id,
        region,
        proceso_movimiento,
        termino,
        dias_horas,
        fecha_sello_c5,
        fecha_recibido_dt,
        observaciones,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Solicitud actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar solicitud',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Actualizar estatus de solicitud
export const updateEstatus = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { estatus_id, comentario } = req.body;

    // Obtener estatus actual
    const [solicitudes] = await connection.query(
      'SELECT estatus_id FROM solicitudes WHERE id = ? AND usuario_id = ?',
      [id, req.userId]
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    const estatus_anterior = solicitudes[0].estatus_id;

    // Actualizar estatus
    await connection.query(
      'UPDATE solicitudes SET estatus_id = ? WHERE id = ?',
      [estatus_id, id]
    );

    // Registrar en historial
    await connection.query(
      `INSERT INTO historial_solicitudes (
        solicitud_id,
        usuario_id,
        estatus_anterior_id,
        estatus_nuevo_id,
        comentario
      ) VALUES (?, ?, ?, ?, ?)`,
      [id, req.userId, estatus_anterior, estatus_id, comentario]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Estatus actualizado exitosamente'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al actualizar estatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estatus',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Eliminar solicitud
export const deleteSolicitud = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    const [result] = await connection.query(
      'DELETE FROM solicitudes WHERE id = ? AND usuario_id = ?',
      [id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Solicitud eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar solicitud',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Obtener estadísticas del usuario
export const getEstadisticas = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // Total de solicitudes
    const [total] = await connection.query(
      'SELECT COUNT(*) as total FROM solicitudes WHERE usuario_id = ?',
      [req.userId]
    );

    // Solicitudes por estatus
    const [porEstatus] = await connection.query(
      `SELECT 
        e.nombre,
        e.color,
        COUNT(*) as cantidad
      FROM solicitudes s
      JOIN estatus_solicitudes e ON s.estatus_id = e.id
      WHERE s.usuario_id = ?
      GROUP BY e.id, e.nombre, e.color`,
      [req.userId]
    );

    // Solicitudes por tipo
    const [porTipo] = await connection.query(
      `SELECT 
        t.nombre,
        COUNT(*) as cantidad
      FROM solicitudes s
      JOIN tipos_oficio t ON s.tipo_oficio_id = t.id
      WHERE s.usuario_id = ?
      GROUP BY t.id, t.nombre`,
      [req.userId]
    );

    // Solicitudes recientes
    const [recientes] = await connection.query(
      `SELECT 
        s.id,
        s.numero_solicitud,
        s.fecha_solicitud,
        e.nombre as estatus_nombre,
        e.color as estatus_color
      FROM solicitudes s
      JOIN estatus_solicitudes e ON s.estatus_id = e.id
      WHERE s.usuario_id = ?
      ORDER BY s.created_at DESC
      LIMIT 5`,
      [req.userId]
    );

    res.json({
      success: true,
      data: {
        total: total[0].total,
        porEstatus,
        porTipo,
        recientes
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  } finally {
    connection.release();
  }
};
