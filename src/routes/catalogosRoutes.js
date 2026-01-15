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

/**
 * @swagger
 * /api/catalogos/tipos-oficio:
 *   get:
 *     tags: [Catálogos]
 *     summary: Obtener todos los tipos de oficio
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de oficio (Alta, Baja, Consulta, etc)
 */
router.get('/tipos-oficio', getTiposOficio);

/**
 * @swagger
 * /api/catalogos/municipios:
 *   get:
 *     tags: [Catálogos]
 *     summary: Obtener todos los municipios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: region_id
 *         schema: { type: integer }
 *         description: Filtrar por región
 *     responses:
 *       200:
 *         description: Lista de municipios de Puebla
 */
router.get('/municipios', getMunicipios);

/**
 * @swagger
 * /api/catalogos/regiones:
 *   get:
 *     tags: [Catálogos]
 *     summary: Obtener todas las regiones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de regiones del estado
 */
router.get('/regiones', getRegiones);

/**
 * @swagger
 * /api/catalogos/estatus:
 *   get:
 *     tags: [Catálogos]
 *     summary: Obtener todos los estatus de solicitudes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de estatus (Pendiente, En Proceso, Aprobada, etc)
 */
router.get('/estatus', getEstatus);

export default router;
