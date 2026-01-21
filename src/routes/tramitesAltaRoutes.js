import express from 'express';
import {
  crearNuevaSolicitud,
  obtenerMisSolicitudes,
  obtenerSolicitudPorId,
  agregarPersonasParaValidar,
  enviarSolicitudAC3,
  obtenerSolicitudesPendientesC3,
  emitirDictamenC3
} from '../controllers/altaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { body } from 'express-validator';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Validaciones para crear nueva solicitud
const validarNuevaSolicitud = [
  body('tipo_oficio_id')
    .notEmpty().withMessage('El tipo de oficio es requerido')
    .isInt().withMessage('El tipo de oficio debe ser un número'),
  
  body('municipio_id')
    .notEmpty().withMessage('El municipio es requerido')
    .isInt().withMessage('El municipio debe ser un número'),
  
  body('dependencia')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('La dependencia no puede exceder 255 caracteres'),
  
  body('termino')
    .optional()
    .isIn(['Ordinario', 'Extraordinario']).withMessage('El término debe ser Ordinario o Extraordinario'),
  
  body('dias_horas')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Los días/horas no pueden exceder 50 caracteres'),
  
  body('fecha_sello_c5')
    .optional()
    .isDate().withMessage('Fecha sello C5 inválida'),
  
  body('fecha_recibido_dt')
    .optional()
    .isDate().withMessage('Fecha recibido DT inválida'),
  
  body('fecha_solicitud')
    .notEmpty().withMessage('La fecha de solicitud es requerida')
    .isDate().withMessage('Fecha de solicitud inválida'),
  
  body('observaciones')
    .optional()
    .trim()
];

/**
 * @swagger
 * /api/tramites/alta/nueva-solicitud:
 *   post:
 *     tags: [Trámites - ALTA]
 *     summary: PASO 1 - Crear nueva solicitud de ALTA
 *     description: Crea una nueva solicitud de ALTA según formulario de la Imagen 5 del mockup. Solo analistas C5 pueden crear solicitudes.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipo_oficio_id, municipio_id, fecha_solicitud]
 *             properties:
 *               tipo_oficio_id: 
 *                 type: integer
 *                 example: 1
 *                 description: Tipo de oficio (Alta, Baja, Consulta, etc.)
 *               municipio_id: 
 *                 type: integer
 *                 example: 114
 *                 description: ID del municipio
 *               dependencia: 
 *                 type: string
 *                 example: "Seguridad Pública Municipal"
 *                 description: Dependencia solicitante
 *               proceso_movimiento: 
 *                 type: string
 *                 example: "ALTA"
 *                 description: Fijo en ALTA para este módulo
 *               termino: 
 *                 type: string
 *                 enum: [Ordinario, Extraordinario]
 *                 example: "Ordinario"
 *                 description: Término del trámite
 *               dias_horas: 
 *                 type: string
 *                 example: "15 días"
 *                 description: Plazo para cumplir
 *               fecha_sello_c5: 
 *                 type: string
 *                 format: date
 *                 example: "2026-01-20"
 *               fecha_recibido_dt: 
 *                 type: string
 *                 format: date
 *                 example: "2026-01-20"
 *               fecha_solicitud: 
 *                 type: string
 *                 format: date
 *                 example: "2026-01-20"
 *               observaciones: 
 *                 type: string
 *                 example: "Trámite urgente"
 *     responses:
 *       201:
 *         description: Solicitud creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     numero_solicitud: { type: string, example: "ALTA-2026-000001" }
 *                     fase_actual: { type: string, example: "datos_solicitud" }
 *       403:
 *         description: Solo analistas C5 pueden crear solicitudes
 */
router.post('/nueva-solicitud', 
  requireRole('analista'), 
  validarNuevaSolicitud, 
  validate, 
  crearNuevaSolicitud
);

/**
 * @swagger
 * /api/tramites/alta/mis-solicitudes:
 *   get:
 *     tags: [Trámites - ALTA]
 *     summary: Listar mis solicitudes de ALTA
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fase
 *         schema: { type: string }
 *         description: Filtrar por fase actual
 *       - in: query
 *         name: busqueda
 *         schema: { type: string }
 *         description: Buscar por número de solicitud o dependencia
 *     responses:
 *       200:
 *         description: Lista de solicitudes del analista
 */
router.get('/mis-solicitudes', 
  requireRole('analista'), 
  obtenerMisSolicitudes
);

/**
 * @swagger
 * /api/tramites/alta/pendientes-c3:
 *   get:
 *     tags: [Trámites - ALTA]
 *     summary: PASO 3 - Solicitudes pendientes de dictamen C3
 *     description: Vista para validadores C3 con solicitudes que esperan dictamen
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes pendientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array }
 *                 total: { type: integer }
 *       403:
 *         description: Solo validadores C3 pueden acceder
 */
router.get('/pendientes-c3', 
  requireRole('validador_c3'), 
  obtenerSolicitudesPendientesC3
);

/**
 * @swagger
 * /api/tramites/alta/{id}:
 *   get:
 *     tags: [Trámites - ALTA]
 *     summary: Obtener detalles de una solicitud con historial
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Detalles de la solicitud
 *       404:
 *         description: Solicitud no encontrada
 */
router.get('/:id', 
  requireRole('analista'), 
  obtenerSolicitudPorId
);

/**
 * @swagger
 * /api/tramites/alta/validar-personal:
 *   post:
 *     tags: [Trámites - ALTA]
 *     summary: PASO 2 - Agregar personas para validar (En desarrollo)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Funcionalidad en desarrollo
 */
router.post('/validar-personal', 
  requireRole('analista'), 
  agregarPersonasParaValidar
);

/**
 * @swagger
 * /api/tramites/alta/enviar-a-c3:
 *   post:
 *     tags: [Trámites - ALTA]
 *     summary: Enviar solicitud a C3 para dictamen
 *     description: El analista C5 envía la solicitud a C3 después de completar PASO 1 o PASO 2
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tramite_id]
 *             properties:
 *               tramite_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID del trámite a enviar
 *     responses:
 *       200:
 *         description: Solicitud enviada a C3 exitosamente
 *       404:
 *         description: Trámite no encontrado
 *       403:
 *         description: Sin permisos
 */
router.post('/enviar-a-c3',
  requireRole('analista'),
  [
    body('tramite_id')
      .notEmpty().withMessage('El ID del trámite es requerido')
      .isInt().withMessage('El ID debe ser un número')
  ],
  validate,
  enviarSolicitudAC3
);

/**
 * @swagger
 * /api/tramites/alta/dictamen-c3:
 *   post:
 *     tags: [Trámites - ALTA]
 *     summary: PASO 3 - Emitir dictamen C3
 *     description: Validador C3 emite dictamen (ALTA OK, NO PUEDE SER DADO DE ALTA, etc.)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tramite_id, dictamen]
 *             properties:
 *               tramite_id:
 *                 type: integer
 *                 example: 1
 *               dictamen:
 *                 type: string
 *                 enum: [ALTA OK, NO PUEDE SER DADO DE ALTA, APROBADO, RECHAZADO]
 *                 example: "ALTA OK"
 *               observaciones_c3:
 *                 type: string
 *                 example: "Cumple con todos los requisitos"
 *     responses:
 *       200:
 *         description: Dictamen registrado
 *       404:
 *         description: Trámite no encontrado
 *       403:
 *         description: Solo validadores C3
 */
router.post('/dictamen-c3',
  requireRole('validador_c3'),
  [
    body('tramite_id')
      .notEmpty().withMessage('El ID del trámite es requerido')
      .isInt().withMessage('El ID debe ser un número'),
    body('dictamen')
      .notEmpty().withMessage('El dictamen es requerido')
      .isIn(['ALTA OK', 'NO PUEDE SER DADO DE ALTA', 'APROBADO', 'RECHAZADO'])
      .withMessage('Dictamen inválido'),
    body('observaciones_c3')
      .optional()
      .trim()
  ],
  validate,
  emitirDictamenC3
);

export default router;
