import express from 'express';
import {
  getTiposOficio,
  getMunicipios,
  getRegiones,
  getEstatus
} from '../controllers/catalogosController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de catálogos
router.get('/tipos-oficio', getTiposOficio);
router.get('/municipios', getMunicipios);
router.get('/regiones', getRegiones);
router.get('/estatus', getEstatus);

export default router;
