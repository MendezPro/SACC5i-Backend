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
 *         description: Filtrar por rol
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *       - in: query
 *         name: region_id
 *         schema:
 *           type: integer
 *         description: Filtrar por región
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Buscar por nombre, apellido, usuario o extensión
 *         example: "Orlando"
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
 *               - usuario
 *               - nombre
 *               - apellido
 *               - extension
 *               - rol
 *             properties:
 *               usuario:
 *                 type: string
 *                 example: juan_perez
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
 *                 description: Opcional - requerido solo para analistas
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
 *     summary: Actualizar perfil de OTRO usuario (Admin/Super Admin)
 *     description: Este endpoint permite a Admin/Super Admin actualizar el perfil de cualquier usuario. Para actualizar TU PROPIO perfil usa /api/auth/profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del usuario a actualizar
 *         schema:
 *           type: integer
 *         example: 4
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Belén"
 *               apellido:
 *                 type: string
 *                 example: "Rodríguez Marín"
 *               extension:
 *                 type: string
 *                 example: "99999"
 *               region_id:
 *                 type: integer
 *                 example: 2
 *           example:
 *             nombre: "Belén"
 *             apellido: "Rodríguez Marín"
 *             extension: "99999"
 *             region_id: 2
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       404:
 *         description: Usuario no encontrado
 *       403:
 *         description: No autorizado (requiere rol Admin o Super Admin)
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
