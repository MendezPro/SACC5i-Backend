import express from 'express';
import {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  updateSolicitud,
  updateEstatus,
  deleteSolicitud,
  getEstadisticas
} from '../controllers/solicitudesController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import {
  createSolicitudValidation,
  updateSolicitudValidation,
  updateEstatusValidation
} from '../validators/solicitudValidators.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

/**
 * @swagger
 * /api/solicitudes:
 *   get:
 *     tags: [Solicitudes]
 *     summary: Listar solicitudes del usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estatus
 *         schema: { type: integer }
 *         description: Filtrar por estatus
 *       - in: query
 *         name: tipo_oficio
 *         schema: { type: integer }
 *         description: Filtrar por tipo de oficio
 *       - in: query
 *         name: busqueda
 *         schema: { type: string }
 *         description: Búsqueda en número de solicitud o proceso
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 *       401:
 *         description: No autenticado
 */
router.get('/', getSolicitudes);

/**
 * @swagger
 * /api/solicitudes/estadisticas:
 *   get:
 *     tags: [Solicitudes]
 *     summary: Obtener estadísticas del usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas generales
 *       401:
 *         description: No autenticado
 */
router.get('/estadisticas', getEstadisticas);

/**
 * @swagger
 * /api/solicitudes/{id}:
 *   get:
 *     tags: [Solicitudes]
 *     summary: Obtener una solicitud específica
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID de la solicitud
 *     responses:
 *       200:
 *         description: Datos de la solicitud con historial
 *       404:
 *         description: Solicitud no encontrada
 */
router.get('/:id', getSolicitudById);

/**
 * @swagger
 * /api/solicitudes:
 *   post:
 *     tags: [Solicitudes]
 *     summary: Crear nueva solicitud
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipo_oficio_id, fecha_solicitud]
 *             properties:
 *               tipo_oficio_id: { type: integer, example: 1 }
 *               municipio_id: { type: integer, example: 1 }
 *               region: { type: string, example: "Región III - Centro" }
 *               proceso_movimiento: { type: string, example: "Alta de cámara" }
 *               termino: { type: string, example: "30 días" }
 *               dias_horas: { type: string, example: "720 horas" }
 *               fecha_sello_c5: { type: string, format: date, example: "2026-01-14" }
 *               fecha_recibido_dt: { type: string, format: date, example: "2026-01-14" }
 *               fecha_solicitud: { type: string, format: date, example: "2026-01-14" }
 *               observaciones: { type: string, example: "Solicitud urgente" }
 *     responses:
 *       201:
 *         description: Solicitud creada
 *       400:
 *         description: Datos inválidos
 */
router.post('/', createSolicitudValidation, validate, createSolicitud);

/**
 * @swagger
 * /api/solicitudes/{id}:
 *   put:
 *     tags: [Solicitudes]
 *     summary: Actualizar solicitud
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipo_oficio_id: { type: integer }
 *               municipio_id: { type: integer }
 *               region: { type: string }
 *               proceso_movimiento: { type: string }
 *               termino: { type: string }
 *               observaciones: { type: string }
 *     responses:
 *       200:
 *         description: Solicitud actualizada
 *       404:
 *         description: Solicitud no encontrada
 */
router.put('/:id', updateSolicitudValidation, validate, updateSolicitud);

/**
 * @swagger
 * /api/solicitudes/{id}/estatus:
 *   put:
 *     tags: [Solicitudes]
 *     summary: Actualizar estatus de solicitud
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estatus_id]
 *             properties:
 *               estatus_id: { type: integer, example: 2 }
 *               comentario: { type: string, example: "Cambio a en proceso" }
 *     responses:
 *       200:
 *         description: Estatus actualizado
 *       404:
 *         description: Solicitud no encontrada
 */
router.put('/:id/estatus', updateEstatusValidation, validate, updateEstatus);

/**
 * @swagger
 * /api/solicitudes/{id}:
 *   delete:
 *     tags: [Solicitudes]
 *     summary: Eliminar solicitud
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Solicitud eliminada
 *       404:
 *         description: Solicitud no encontrada
 */
router.delete('/:id', deleteSolicitud);

export default router;
