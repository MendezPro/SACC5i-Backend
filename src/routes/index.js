import express from 'express';
import authRoutes from './authRoutes.js';
import solicitudesRoutes from './solicitudesRoutes.js';
import catalogosRoutes from './catalogosRoutes.js';
import adminRoutes from './adminRoutes.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de administración (requiere autenticación)
router.use('/admin', authMiddleware, adminRoutes);

// Rutas de solicitudes
router.use('/solicitudes', solicitudesRoutes);

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
