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
  obtenerPersonasPendientesC3,
  obtenerSolicitudParaC3,
  obtenerHistorialC3,
  emitirDictamenPersonaC3,
  obtenerTodasLasPersonasC5,
  obtenerTramitesRechazados,
  obtenerPropuestasC3,
  emitirDecisionFinalC5
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
 *     tags: [C5 - Gestión de Trámites]
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
 *     tags: [C5 - Gestión de Trámites]
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

// ============================================
// NUEVAS RUTAS C3 - VISTA POR PERSONA
// ============================================

/**
 * @swagger
 * /api/tramites/alta/personas-pendientes-c3:
 *   get:
 *     tags: [C3 - Validación]
 *     summary: Ver PERSONAS pendientes de dictamen (Vista por persona)
 *     description: C3 ve una tabla de personas individuales, no de trámites. Cada fila es una persona que necesita dictamen.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: busqueda
 *         schema: { type: string }
 *         description: Buscar por nombre o número de solicitud
 *     responses:
 *       200:
 *         description: Lista de personas pendientes
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
 *                       id: { type: integer, example: 15 }
 *                       nombre_completo: { type: string, example: "María Hernández Martínez" }
 *                       puesto_nombre: { type: string, example: "POLICÍA TERCERO" }
 *                       puesto_propuesto_nombre: { type: string, nullable: true }
 *                       numero_solicitud: { type: string, example: "ALTA-2026-000002" }
 *                       fecha_solicitud: { type: string, format: date }
 *                       municipio_nombre: { type: string, example: "Puebla" }
 *                       dependencia_nombre: { type: string, example: "SSP MUNICIPAL" }
 *                       analista_nombre: { type: string }
 *                 total: { type: integer }
 *       403:
 *         description: Solo validadores C3
 */
router.get('/personas-pendientes-c3',
  requireRole('validador_c3'),
  obtenerPersonasPendientesC3
);

/**
 * @swagger
 * /api/tramites/alta/persona/{persona_id}/dictamen-c3:
 *   post:
 *     tags: [Trámites - ALTA - C3]
 *     summary: Emitir dictamen para UNA persona (NO para el trámite completo)
 *     description: C3 dicta sobre una persona individual. Puede marcar ALTA OK, NO PUEDE SER DADO DE ALTA, o dejar PENDIENTE. Opcionalmente puede proponer un cambio de puesto.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: persona_id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estatus]
 *             properties:
 *               estatus:
 *                 type: string
 *                 enum: [ALTA OK, NO PUEDE SER DADO DE ALTA, PENDIENTE]
 *                 example: "ALTA OK"
 *               observaciones_c3:
 *                 type: string
 *                 example: "Cumple requisitos"
 *               puesto_propuesto_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 12
 *                 description: "ID del puesto propuesto (opcional, solo si se sugiere cambio)"
 *           examples:
 *             aprobar_sin_cambio:
 *               summary: Aprobar sin cambio de puesto
 *               value:
 *                 estatus: "ALTA OK"
 *                 observaciones_c3: "Aprobado"
 *             aprobar_con_cambio:
 *               summary: Aprobar con propuesta de cambio
 *               value:
 *                 estatus: "ALTA OK"
 *                 observaciones_c3: "Se sugiere cambio a Inspector"
 *                 puesto_propuesto_id: 12
 *             rechazar:
 *               summary: Rechazar
 *               value:
 *                 estatus: "NO PUEDE SER DADO DE ALTA"
 *                 observaciones_c3: "No cumple perfil"
 *     responses:
 *       200:
 *         description: Dictamen registrado
 *       403:
 *         description: Solo validadores C3
 */
router.post('/persona/:persona_id/dictamen-c3',
  requireRole('validador_c3'),
  [
    body('estatus')
      .isIn(['ALTA OK', 'NO PUEDE SER DADO DE ALTA', 'PENDIENTE'])
      .withMessage('Estatus inválido'),
    body('observaciones_c3').optional().trim(),
    body('puesto_propuesto_id').optional().isInt()
  ],
  validate,
  emitirDictamenPersonaC3
);

// ============================================
// NUEVAS RUTAS C5 - VISTA UNIFICADA DE PERSONAS
// ============================================

/**
 * @swagger
 * /api/tramites/alta/todas-personas-c5:
 *   get:
 *     tags: [Tramites Alta - C5]
 *     summary: Ver TODAS las personas (Vista unificada para C5)
 *     description: C5 ve una tabla con TODAS las personas de TODOS sus trámites, sin importar estatus. La tabla no filtra automáticamente, solo el botón refrescar actualiza los estatus visibles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: busqueda
 *         schema: { type: string }
 *       - in: query
 *         name: fase_tramite
 *         schema: { type: string }
 *         description: Filtrar por fase del trámite
 *       - in: query
 *         name: estatus_persona
 *         schema: 
 *           type: string
 *           enum: [validado, rechazado, pendiente]
 *         description: Filtrar por estatus de la persona
 *     responses:
 *       200:
 *         description: Lista de todas las personas
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
 *                       nombre_completo: { type: string }
 *                       numero_solicitud: { type: string }
 *                       tramite_fase: { type: string }
 *                       puesto_original_nombre: { type: string }
 *                       puesto_propuesto_nombre: { type: string, nullable: true }
 *                       estatus_descriptivo: { type: string, example: "Aprobado por C3" }
 *                       validado: { type: boolean }
 *                       rechazado: { type: boolean }
 *                       tiene_propuesta_cambio: { type: boolean }
 *                       decision_final_c5: { type: string, enum: [original, propuesta, pendiente] }
 *                 total: { type: integer }
 *       403:
 *         description: Solo analistas C5
 */
router.get('/todas-personas-c5',
  requireRole('analista'),
  obtenerTodasLasPersonasC5
);

/**
 * @swagger
 * /api/tramites/alta/historial-c3:
 *   get:
 *     tags: [C3 - Validación]
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
 * /api/tramites/alta/c3/{id}:
 *   get:
 *     tags: [C3 - Validación]
 *     summary: Ver detalle de solicitud para C3
 *     description: Obtiene todos los detalles de una solicitud incluyendo todas las personas agregadas, historial y datos completos. Solo para validadores C3.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: 
 *           type: integer
 *         description: ID del trámite a consultar
 *     responses:
 *       200:
 *         description: Detalles completos de la solicitud con personas e historial
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     numero_solicitud: { type: string, example: "ALTA-2026-000002" }
 *                     municipio_nombre: { type: string }
 *                     region_nombre: { type: string }
 *                     dependencia_nombre: { type: string }

 *                     analista_nombre: { type: string }
 *                     analista_extension: { type: string }
 *                     fase_actual: { type: string }
 *                     termino: { type: string }
 *                     observaciones: { type: string }
 *                     personas:
 *                       type: array
 *                       description: Todas las personas del trámite
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           nombre: { type: string }
 *                           apellido_paterno: { type: string }
 *                           apellido_materno: { type: string }
 *                           fecha_nacimiento: { type: string, format: date }
 *                           numero_oficio_c3: { type: string }
 *                           puesto_nombre: { type: string }
 *                           es_competencia_municipal: { type: boolean }
 *                           validado: { type: boolean }
 *                           rechazado: { type: boolean }
 *                           motivo_rechazo: { type: string }
 *                     historial:
 *                       type: array
 *                       description: Historial de cambios del trámite
 *                       items:
 *                         type: object
 *                         properties:
 *                           fase_anterior: { type: string }
 *                           fase_nueva: { type: string }
 *                           comentario: { type: string }
 *                           usuario_nombre: { type: string }
 *                           created_at: { type: string, format: date-time }
 *       403:
 *         description: Solo validadores C3 pueden acceder
 *       404:
 *         description: Solicitud no encontrada o no disponible para C3
 */
router.get('/c3/:id', 
  requireRole('validador_c3'), 
  obtenerSolicitudParaC3
);

/**
 * @swagger
 * /api/tramites/alta/{id}:
 *   get:
 *     tags: [C5 - Gestión de Trámites]
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
 *     tags: [C5 - Gestión de Trámites]
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
 *     tags: [C5 - Gestión de Trámites]
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
 *     tags: [C5 - Gestión de Trámites]
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
 *     tags: [C5 - Gestión de Trámites]
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
 *     tags: [C5 - Gestión de Trámites]
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

// ============================================
// TABLA DE RECHAZADOS (Solo C5)
// ============================================

/**
 * @swagger
 * /api/tramites/alta/rechazados:
 *   get:
 *     summary: Obtener tabla de trámites rechazados (Solo C5)
 *     tags: [C5 - Gestión de Trámites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha_inicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar desde esta fecha
 *       - in: query
 *         name: fecha_fin
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar hasta esta fecha
 *       - in: query
 *         name: busqueda
 *         schema:
 *           type: string
 *         description: Búsqueda por número de solicitud, municipio o dependencia
 *       - in: query
 *         name: fase_rechazo
 *         schema:
 *           type: string
 *           enum: [rechazado, rechazado_no_corresponde]
 *         description: Filtrar por tipo de rechazo
 *     responses:
 *       200:
 *         description: Lista de trámites rechazados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 15
 *                       numero_solicitud:
 *                         type: string
 *                         example: "ALTA-2025-000015"
 *                       fase_actual:
 *                         type: string
 *                         example: "rechazado_no_corresponde"
 *                       etapa_rechazo:
 *                         type: string
 *                         example: "Validación de Personal (Filtro de Competencia)"
 *                       motivo_rechazo_general:
 *                         type: string
 *                         example: "Puesto(s) fuera de competencia municipal: CUSTODIO"
 *                       fecha_rechazo:
 *                         type: string
 *                         format: date-time
 *                       municipio_nombre:
 *                         type: string
 *                         example: "Tuxtla Gutiérrez"
 *                       dependencia_nombre:
 *                         type: string
 *                         example: "CENTROS DE REINSERCIÓN SOCIAL"
 *                       personas:
 *                         type: array
 *                         items:
 *                           type: object
 *                 total:
 *                   type: integer
 *                   example: 5
 *                 message:
 *                   type: string
 *                   example: "5 trámites rechazados encontrados"
 *       403:
 *         description: Solo analistas C5
 */
router.get('/rechazados',
  requireRole('analista'),
  obtenerTramitesRechazados
);

// ============================================
// REVISIÓN DE PROPUESTAS C3 (Solo C5)
// ============================================

/**
 * @swagger
 * /api/tramites/alta/propuestas-c3:
 *   get:
 *     summary: Obtener trámites con propuestas de cambio de puesto de C3 (Solo C5)
 *     tags: [C5 - Gestión de Trámites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: busqueda
 *         schema:
 *           type: string
 *         description: Búsqueda por número de solicitud, municipio o dependencia
 *     responses:
 *       200:
 *         description: Lista de trámites con propuestas de C3
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       numero_solicitud:
 *                         type: string
 *                       fase_actual:
 *                         type: string
 *                         example: "revision_propuesta_c3"
 *                       municipio_nombre:
 *                         type: string
 *                       dependencia_nombre:
 *                         type: string
 *                       validador_c3_nombre:
 *                         type: string
 *                       total_propuestas:
 *                         type: integer
 *                         description: Cantidad de personas con propuesta de cambio
 *                       personas:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             nombre:
 *                               type: string
 *                             puesto_original_nombre:
 *                               type: string
 *                             puesto_propuesto_nombre:
 *                               type: string
 *                             tiene_propuesta_cambio:
 *                               type: boolean
 *                             decision_final_c5:
 *                               type: string
 *                               enum: [original, propuesta, pendiente]
 *                 total:
 *                   type: integer
 *                 message:
 *                   type: string
 *       403:
 *         description: Solo analistas C5
 */
router.get('/propuestas-c3',
  requireRole('analista'),
  obtenerPropuestasC3
);

/**
 * @swagger
 * /api/tramites/alta/decision-final-c5:
 *   post:
 *     summary: Emitir decisión final de C5 sobre propuestas de C3 (Solo C5)
 *     tags: [C5 - Gestión de Trámites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tramite_id
 *               - decisiones
 *             properties:
 *               tramite_id:
 *                 type: integer
 *                 example: 15
 *               decisiones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     persona_id:
 *                       type: integer
 *                       example: 42
 *                     decision:
 *                       type: string
 *                       enum: [original, propuesta]
 *                       example: "propuesta"
 *                       description: "original = mantener puesto original, propuesta = aceptar puesto propuesto por C3"
 *     responses:
 *       200:
 *         description: Decisión final registrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Todas las decisiones registradas. Trámite aprobado con decisión final de C5."
 *                 data:
 *                   type: object
 *                   properties:
 *                     tramite_id:
 *                       type: integer
 *                     decisiones_procesadas:
 *                       type: integer
 *                     fase_nueva:
 *                       type: string
 *                     todas_decisiones_tomadas:
 *                       type: boolean
 *       400:
 *         description: Error en validación
 *       403:
 *         description: Solo analistas C5
 */
router.post('/decision-final-c5',
  requireRole('analista'),
  [
    body('tramite_id')
      .notEmpty().withMessage('El ID del trámite es requerido')
      .isInt().withMessage('El ID debe ser un número'),
    body('decisiones')
      .isArray({ min: 1 }).withMessage('Debe proporcionar al menos una decisión')
  ],
  validate,
  emitirDecisionFinalC5
);

export default router;
