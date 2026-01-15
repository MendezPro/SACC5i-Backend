import express from 'express';
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deactivateUsuario,
  activateUsuario,
  resetPassword,
  getEstadisticasAdmin
} from '../controllers/adminController.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/admin/usuarios:
 *   get:
 *     summary: Obtener lista de usuarios (Admin/Super Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [super_admin, admin, analista]
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: region_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       403:
 *         description: No autorizado
 */
router.get('/usuarios', requireAdmin, getUsuarios);

/**
 * @swagger
 * /api/admin/usuarios:
 *   post:
 *     summary: Crear nuevo usuario (Admin/Super Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - nombre
 *               - apellido
 *               - extension
 *               - rol
 *             properties:
 *               username:
 *                 type: string
 *                 example: juan.perez
 *               nombre:
 *                 type: string
 *                 example: Juan
 *               apellido:
 *                 type: string
 *                 example: Pérez
 *               extension:
 *                 type: string
 *                 example: "12345"
 *               rol:
 *                 type: string
 *                 enum: [admin, analista]
 *                 example: analista
 *               region_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: No autorizado
 */
router.post('/usuarios', requireAdmin, createUsuario);

/**
 * @swagger
 * /api/admin/usuarios/{id}:
 *   put:
 *     summary: Actualizar usuario (Admin/Super Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               extension:
 *                 type: string
 *               region_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/usuarios/:id', requireAdmin, updateUsuario);

/**
 * @swagger
 * /api/admin/usuarios/{id}/deactivate:
 *   patch:
 *     summary: Desactivar usuario (Admin/Super Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario desactivado
 *       400:
 *         description: No se puede desactivar Super Admin
 */
router.patch('/usuarios/:id/deactivate', requireAdmin, deactivateUsuario);

/**
 * @swagger
 * /api/admin/usuarios/{id}/activate:
 *   patch:
 *     summary: Activar usuario (Admin/Super Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario activado
 */
router.patch('/usuarios/:id/activate', requireAdmin, activateUsuario);

/**
 * @swagger
 * /api/admin/usuarios/{id}/reset-password:
 *   patch:
 *     summary: Resetear contraseña a número de extensión (Admin/Super Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contraseña reseteada a extensión
 */
router.patch('/usuarios/:id/reset-password', requireAdmin, resetPassword);

/**
 * @swagger
 * /api/admin/estadisticas:
 *   get:
 *     summary: Obtener estadísticas del sistema (Admin/Super Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del sistema
 */
router.get('/estadisticas', requireAdmin, getEstadisticasAdmin);

export default router;
