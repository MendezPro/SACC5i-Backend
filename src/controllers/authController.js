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

// Registrar nuevo usuario
export const register = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const {
      nombre_completo,
      usuario,
      password,
      fecha_nacimiento,
      region,
      extension
    } = req.body;

    // Verificar si el usuario ya existe
    const [existingUser] = await connection.query(
      'SELECT id FROM usuarios WHERE usuario = ?',
      [usuario]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario ya está en uso'
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario
    const [result] = await connection.query(
      `INSERT INTO usuarios (nombre_completo, usuario, password, fecha_nacimiento, region, extension)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre_completo, usuario, hashedPassword, fecha_nacimiento, region, extension]
    );

    // Generar token
    const token = generateToken(result.insertId);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        id: result.insertId,
        nombre_completo,
        usuario,
        region,
        token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Login de usuario
export const login = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { usuario, password } = req.body;

    // Buscar usuario
    const [users] = await connection.query(
      'SELECT * FROM usuarios WHERE usuario = ? AND activo = TRUE',
      [usuario]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    const user = users[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    // Generar token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        usuario: user.usuario,
        extension: user.extension,
        region_id: user.region_id,
        rol: user.rol,
        password_changed: user.password_changed,
        token
      },
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
      `SELECT u.id, u.nombre_completo, u.usuario, u.extension, u.region_id, u.rol, u.password_changed,
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
    const { nombre_completo, fecha_nacimiento, region, extension } = req.body;

    await connection.query(
      `UPDATE usuarios 
       SET nombre_completo = ?, fecha_nacimiento = ?, region = ?, extension = ?
       WHERE id = ?`,
      [nombre_completo, fecha_nacimiento, region, extension, req.userId]
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
