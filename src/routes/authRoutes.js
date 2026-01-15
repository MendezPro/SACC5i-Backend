import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} from '../validators/authValidators.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Autenticación]
 *     summary: Registrar nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre_completo, usuario, password]
 *             properties:
 *               nombre_completo: { type: string, example: "Yulissa Ortega" }
 *               usuario: { type: string, example: "yulissa.ortega" }
 *               password: { type: string, example: "password123" }
 *               fecha_nacimiento: { type: string, format: date, example: "1995-05-15" }
 *               region: { type: string, example: "Región III - Centro" }
 *               extension: { type: string, example: "1234" }
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos inválidos o usuario existente
 */
router.post('/register', registerValidation, validate, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Autenticación]
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuario, password]
 *             properties:
 *               usuario: { type: string, example: "yulissa.ortega" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Login exitoso, retorna token JWT
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', loginValidation, validate, login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Autenticación]
 *     summary: Obtener perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del perfil
 *       401:
 *         description: No autenticado
 */
router.get('/profile', authMiddleware, getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [Autenticación]
 *     summary: Actualizar perfil del usuario
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_completo: { type: string }
 *               fecha_nacimiento: { type: string, format: date }
 *               region: { type: string }
 *               extension: { type: string }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       401:
 *         description: No autenticado
 */
router.put('/profile', authMiddleware, updateProfileValidation, validate, updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     tags: [Autenticación]
 *     summary: Cambiar contraseña
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, example: "password123" }
 *               newPassword: { type: string, example: "newPassword456" }
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       401:
 *         description: Contraseña actual incorrecta
 */
router.put('/change-password', authMiddleware, changePasswordValidation, validate, changePassword);

export default router;
