import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Generar token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Registrar nuevo usuario - DESHABILITADO
// Solo los administradores pueden crear usuarios desde /api/admin/usuarios
export const register = async (req, res) => {
  res.status(403).json({
    success: false,
    message: 'El registro público está deshabilitado. Solo los administradores pueden crear usuarios del sistema.',
    contacto: 'Contacte al administrador del sistema para solicitar acceso.'
  });
};

// Login de usuario
export const login = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { username, password } = req.body;

    console.log('🔐 Intento de login:');
    console.log('   Username recibido:', username);
    console.log('   Password recibido:', password ? '***' : 'undefined');
    console.log('   Body completo:', JSON.stringify(req.body));

    // Buscar usuario
    const [users] = await connection.query(
      'SELECT * FROM usuarios WHERE usuario = ? AND activo = TRUE',
      [username]
    );

    console.log('   Usuarios encontrados:', users.length);

    if (users.length === 0) {
      console.log('❌ Usuario no encontrado o inactivo');
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    const user = users[0];
    console.log('   Usuario DB:', user.usuario);
    console.log('   Usuario activo:', user.activo);
    console.log('   Rol:', user.rol);

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);

    console.log('   Password válido:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Contraseña incorrecta');
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    console.log('✅ Login exitoso para:', user.usuario);

    // Generar token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      usuario: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        usuario: user.usuario,
        extension: user.extension,
        region_id: user.region_id,
        rol: user.rol,
        password_changed: user.password_changed
      },
      token,
      // Alerta si no ha cambiado la contraseña
      warning: !user.password_changed ? 'Por seguridad, se recomienda cambiar tu contraseña temporal' : null
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Obtener perfil del usuario autenticado
export const getProfile = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [users] = await connection.query(
      `SELECT u.id, u.nombre, u.apellido, u.usuario, u.extension, 
              u.region_id, u.rol, u.password_changed, u.activo,
              u.created_at, r.nombre as region_nombre
       FROM usuarios u
       LEFT JOIN regiones r ON u.region_id = r.id
       WHERE u.id = ?`,
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: users[0],
      warning: !users[0].password_changed ? 'Por seguridad, se recomienda cambiar tu contraseña temporal' : null
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Actualizar perfil
export const updateProfile = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { nombre, apellido, extension } = req.body;

    await connection.query(
      `UPDATE usuarios 
       SET nombre = ?, apellido = ?, extension = ?
       WHERE id = ?`,
      [nombre, apellido, extension, req.userId]
    );

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Cambiar contraseña
export const changePassword = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { currentPassword, newPassword } = req.body;

    // Obtener contraseña actual
    const [users] = await connection.query(
      'SELECT password FROM usuarios WHERE id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(currentPassword, users[0].password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña Y marcar como cambiada
    await connection.query(
      'UPDATE usuarios SET password = ?, password_changed = TRUE WHERE id = ?',
      [hashedPassword, req.userId]
    );

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña',
      error: error.message
    });
  } finally {
    connection.release();
  }
};
