import { body } from 'express-validator';

export const createSolicitudValidation = [
  body('tipo_oficio_id')
    .notEmpty().withMessage('El tipo de oficio es requerido')
    .isInt().withMessage('El tipo de oficio debe ser un número'),
  
  body('municipio_id')
    .optional()
    .isInt().withMessage('El municipio debe ser un número'),
  
  body('region')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('La región no puede exceder 100 caracteres'),
  
  body('proceso_movimiento')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('El proceso/movimiento no puede exceder 255 caracteres'),
  
  body('termino')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El término no puede exceder 100 caracteres'),
  
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

export const updateSolicitudValidation = [
  body('tipo_oficio_id')
    .optional()
    .isInt().withMessage('El tipo de oficio debe ser un número'),
  
  body('municipio_id')
    .optional()
    .isInt().withMessage('El municipio debe ser un número'),
  
  body('region')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('La región no puede exceder 100 caracteres'),
  
  body('proceso_movimiento')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('El proceso/movimiento no puede exceder 255 caracteres'),
  
  body('termino')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El término no puede exceder 100 caracteres'),
  
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
  
  body('observaciones')
    .optional()
    .trim()
];

export const updateEstatusValidation = [
  body('estatus_id')
    .notEmpty().withMessage('El estatus es requerido')
    .isInt().withMessage('El estatus debe ser un número'),
  
  body('comentario')
    .optional()
    .trim()
];
