import express from 'express';
import {
  crearNuevaSolicitud,
  obtenerMisSolicitudes,
  obtenerSolicitudPorId,
  agregarPersona,
  obtenerPersonasPorTramite,
  validarPersona,
  rechazarPersona,
  enviarSolicitudAC3,
  obtenerSolicitudesPendientesC3,
  obtenerHistorialC3,
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
  
  body('dependencia_id')
    .notEmpty().withMessage('La dependencia es requerida')
    .isInt().withMessage('La dependencia debe ser un número'),
  
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
 *             required: [tipo_oficio_id, municipio_id, dependencia_id, fecha_solicitud]
 *             properties:
 *               tipo_oficio_id: 
 *                 type: integer
 *                 example: 1
 *                 description: Tipo de oficio (Alta, Baja, Consulta, etc.)
 *               municipio_id: 
 *                 type: integer
 *                 example: 114
 *                 description: ID del municipio
 *               dependencia_id: 
 *                 type: integer
 *                 example: 3
 *                 description: ID de la dependencia (catálogo de 28 dependencias - ej. 3=CGC5I)
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
 * /api/tramites/alta/historial-c3:
 *   get:
 *     tags: [Trámites - ALTA]
 *     summary: Historial de trámites procesados por C3
 *     description: Obtiene todos los trámites que el validador C3 ya procesó (validados, rechazados). Para el tab "Enviados" del panel C3.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha_inicio
 *         schema: { type: string, format: date }
 *         description: Fecha inicio para filtrar
 *       - in: query
 *         name: fecha_fin
 *         schema: { type: string, format: date }
 *         description: Fecha fin para filtrar
 *       - in: query
 *         name: busqueda
 *         schema: { type: string }
 *         description: Buscar por número, municipio o dependencia
 *       - in: query
 *         name: dictamen
 *         schema: 
 *           type: string
 *           enum: [validado_c3, rechazado, rechazado_no_corresponde]
 *         description: Filtrar por tipo de dictamen
 *     responses:
 *       200:
 *         description: Lista de trámites procesados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       numero_solicitud: { type: string }
 *                       fase_actual: { type: string }
 *                       municipio_nombre: { type: string }
 *                       region_nombre: { type: string }
 *                       personas_stats:
 *                         type: object
 *                         properties:
 *                           total: { type: integer }
 *                           validadas: { type: integer }
 *                           rechazadas: { type: integer }
 *                 total: { type: integer }
 *       403:
 *         description: Solo validadores C3
 */
router.get('/historial-c3', 
  requireRole('validador_c3'), 
  obtenerHistorialC3
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

// ============================================
// PASO 2: VALIDACIÓN DE PERSONAL
// ============================================

/**
 * @swagger
 * /api/tramites/alta/{tramite_id}/personas:
 *   post:
 *     tags: [Trámites - ALTA]
 *     summary: PASO 2 - Agregar persona al trámite
 *     description: Agrega una persona al trámite para validación. Si el puesto NO es competencia municipal (CUSTODIO, GUARDIA NACIONAL, MILITAR), se rechaza automáticamente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tramite_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del trámite
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido_paterno, fecha_nacimiento, numero_oficio_c3, puesto_id]
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Juan"
 *               apellido_paterno:
 *                 type: string
 *                 example: "Pérez"
 *               apellido_materno:
 *                 type: string
 *                 example: "García"
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *                 example: "1990-05-15"
 *               numero_oficio_c3:
 *                 type: string
 *                 example: "CECSNSP/DGCECC/0633/2025"
 *               puesto_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID del puesto (ver catálogo de puestos)
 *     responses:
 *       201:
 *         description: Persona agregada
 *       403:
 *         description: Solo analistas C5
 */
router.post('/:tramite_id/personas',
  requireRole('analista'),
  [
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('apellido_paterno').notEmpty().withMessage('El apellido paterno es requerido'),
    body('fecha_nacimiento').notEmpty().isDate().withMessage('Fecha de nacimiento inválida'),
    body('numero_oficio_c3').notEmpty().withMessage('El número de oficio C3 es requerido'),
    body('puesto_id').notEmpty().isInt().withMessage('El puesto es requerido')
  ],
  validate,
  agregarPersona
);

/**
 * @swagger
 * /api/tramites/alta/{tramite_id}/personas:
 *   get:
 *     tags: [Trámites - ALTA]
 *     summary: PASO 2 - Obtener personas del trámite
 *     description: Lista todas las personas agregadas a un trámite con su estado de validación
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tramite_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de personas
 */
router.get('/:tramite_id/personas',
  requireRole('analista'),
  obtenerPersonasPorTramite
);

/**
 * @swagger
 * /api/tramites/alta/persona/{persona_id}/validar:
 *   put:
 *     tags: [Trámites - ALTA]
 *     summary: PASO 2 - Validar persona
 *     description: Marca una persona como validada (aprobada)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: persona_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Persona validada
 *       403:
 *         description: Solo analistas C5
 */
router.put('/persona/:persona_id/validar',
  requireRole('analista'),
  validarPersona
);

/**
 * @swagger
 * /api/tramites/alta/persona/{persona_id}/rechazar:
 *   put:
 *     tags: [Trámites - ALTA]
 *     summary: PASO 2 - Rechazar persona
 *     description: Rechaza una persona con un motivo específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: persona_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motivo_rechazo]
 *             properties:
 *               motivo_rechazo:
 *                 type: string
 *                 example: "Documentación incompleta"
 *     responses:
 *       200:
 *         description: Persona rechazada
 *       403:
 *         description: Solo analistas C5
 */
router.put('/persona/:persona_id/rechazar',
  requireRole('analista'),
  [
    body('motivo_rechazo').notEmpty().withMessage('El motivo de rechazo es requerido')
  ],
  validate,
  rechazarPersona
);

// ============================================
// PASO 3: ENVÍO A C3 Y DICTAMEN
// ============================================

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
