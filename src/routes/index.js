import express from 'express';
import authRoutes from './authRoutes.js';
import catalogosRoutes from './catalogosRoutes.js';
import adminRoutes from './adminRoutes.js';
import tramitesAltaRoutes from './tramitesAltaRoutes.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de administración (requiere autenticación)
router.use('/admin', authMiddleware, adminRoutes);

// MÓDULO: Trámites de ALTA (estructura modular)
router.use('/tramites/alta', tramitesAltaRoutes);

// Rutas de catálogos
router.use('/catalogos', catalogosRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Sistema]
 *     summary: Verificar estado del servidor
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API SACC5i funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

export default router;
