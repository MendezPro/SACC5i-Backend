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

// Rutas de solicitudes
router.get('/', getSolicitudes);
router.get('/estadisticas', getEstadisticas);
router.get('/:id', getSolicitudById);
router.post('/', createSolicitudValidation, validate, createSolicitud);
router.put('/:id', updateSolicitudValidation, validate, updateSolicitud);
router.put('/:id/estatus', updateEstatusValidation, validate, updateEstatus);
router.delete('/:id', deleteSolicitud);

export default router;
