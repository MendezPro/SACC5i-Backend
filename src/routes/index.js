import express from 'express';
import authRoutes from './authRoutes.js';
import solicitudesRoutes from './solicitudesRoutes.js';
import catalogosRoutes from './catalogosRoutes.js';

const router = express.Router();

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de solicitudes
router.use('/solicitudes', solicitudesRoutes);

// Rutas de catálogos
router.use('/catalogos', catalogosRoutes);

// Ruta de prueba
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API SACC5i funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

export default router;
