import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

// ============================================
// GESTIÓN DE USUARIOS (Solo para ADMIN)
// ============================================

// Listar todos los usuarios
export const getUsuarios = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { rol, activo, region_id } = req.query;
    
    let query = `
      SELECT u.id, u.nombre_completo, u.usuario, u.extension, u.region_id, u.rol, 
             u.activo, u.password_changed, u.created_at, r.nombre as region_nombre
      FROM usuarios u
      LEFT JOIN regiones r ON u.region_id = r.id
      WHERE 1=1
    `;
    
    const params = [];

    if (rol) {
      query += ' AND u.rol = ?';
      params.push(rol);
    }

    if (activo !== undefined) {
      query += ' AND u.activo = ?';
      params.push(activo === 'true' || activo === true);
    }

    if (region_id) {
      query += ' AND u.region_id = ?';
      params.push(region_id);
    }

    query += ' ORDER BY u.rol, u.nombre_completo';

    const [usuarios] = await connection.query(query, params);

    res.json({
      success: true,
      data: usuarios,
      total: usuarios.length
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Crear nuevo usuario (Analista)
export const createUsuario = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const {
      nombre_completo,
      usuario,
      extension,
      region_id,
      rol
    } = req.body;

    // Verificar que el usuario no exista
    const [existing] = await connection.query(
      'SELECT id FROM usuarios WHERE usuario = ? OR extension = ?',
      [usuario, extension]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El usuario o extensión ya existe'
      });
    }

    // Verificar que la región exista (si se proporciona)
    if (region_id) {
      const [region] = await connection.query(
        'SELECT id FROM regiones WHERE id = ?',
        [region_id]
      );

      if (region.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La región especificada no existe'
        });
      }
    }

    // Password inicial = extensión
    const hashedPassword = await bcrypt.hash(extension, 10);

    // Insertar usuario
    const [result] = await connection.query(
      `INSERT INTO usuarios (nombre_completo, usuario, password, extension, region_id, rol, password_changed)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [nombre_completo, usuario, hashedPassword, extension, region_id, rol || 'analista']
    );

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        id: result.insertId,
        nombre_completo,
        usuario,
        extension,
        region_id,
        rol: rol || 'analista',
        password_inicial: extension
      }
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Actualizar usuario
export const updateUsuario = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { nombre_completo, extension, region_id, rol } = req.body;

    // Verificar que el usuario existe
    const [existing] = await connection.query(
      'SELECT id FROM usuarios WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar región si se proporciona
    if (region_id) {
      const [region] = await connection.query(
        'SELECT id FROM regiones WHERE id = ?',
        [region_id]
      );

      if (region.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La región especificada no existe'
        });
      }
    }

    await connection.query(
      `UPDATE usuarios 
       SET nombre_completo = COALESCE(?, nombre_completo),
           extension = COALESCE(?, extension),
           region_id = ?,
           rol = COALESCE(?, rol)
       WHERE id = ?`,
      [nombre_completo, extension, region_id, rol, id]
    );

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Dar de baja usuario (Soft Delete)
export const deactivateUsuario = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    // No permitir desactivar super admins
    const [user] = await connection.query(
      'SELECT rol FROM usuarios WHERE id = ?',
      [id]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (user[0].rol === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'No se puede desactivar un Super Admin'
      });
    }

    // Desactivar usuario (Soft Delete)
    await connection.query(
      'UPDATE usuarios SET activo = FALSE WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });

  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar usuario',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Reactivar usuario
export const activateUsuario = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    await connection.query(
      'UPDATE usuarios SET activo = TRUE WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Usuario reactivado exitosamente'
    });

  } catch (error) {
    console.error('Error al reactivar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reactivar usuario',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Resetear contraseña de usuario (vuelve a la extensión)
export const resetPassword = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    // Obtener extensión del usuario
    const [users] = await connection.query(
      'SELECT extension FROM usuarios WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const { extension } = users[0];

    // Password = extensión
    const hashedPassword = await bcrypt.hash(extension, 10);

    await connection.query(
      'UPDATE usuarios SET password = ?, password_changed = FALSE WHERE id = ?',
      [hashedPassword, id]
    );

    res.json({
      success: true,
      message: 'Contraseña reseteada exitosamente',
      data: {
        password_temporal: extension
      }
    });

  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al resetear contraseña',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ============================================
// ESTADÍSTICAS DE ADMINISTRACIÓN
// ============================================
export const getEstadisticasAdmin = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // Total de usuarios por rol
    const [porRol] = await connection.query(`
      SELECT rol, COUNT(*) as cantidad, 
             SUM(CASE WHEN activo = TRUE THEN 1 ELSE 0 END) as activos
      FROM usuarios
      GROUP BY rol
    `);

    // Usuarios que no han cambiado contraseña
    const [sinCambiar] = await connection.query(`
      SELECT COUNT(*) as cantidad
      FROM usuarios
      WHERE password_changed = FALSE AND activo = TRUE
    `);

    // Solicitudes por región
    const [porRegion] = await connection.query(`
      SELECT r.nombre, COUNT(s.id) as total_solicitudes
      FROM regiones r
      LEFT JOIN usuarios u ON r.id = u.region_id
      LEFT JOIN solicitudes s ON u.id = s.usuario_id
      GROUP BY r.id, r.nombre
      ORDER BY total_solicitudes DESC
    `);

    res.json({
      success: true,
      data: {
        usuarios_por_rol: porRol,
        usuarios_sin_cambiar_password: sinCambiar[0].cantidad,
        solicitudes_por_region: porRegion
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
