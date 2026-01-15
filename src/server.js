import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { testConnection } from './config/database.js';
import swaggerSpec from './config/swagger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware.js';

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middlewares globales
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI - Documentación interactiva
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SACC5i API Documentation'
}));

// Logging de requests en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Rutas de la API
app.use('/api', routes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API SACC5i - Sistema de Atención a la Ciudadanía del C5i',
    version: '1.0.0',
    documentation: `http://localhost:${PORT}/api-docs`,
    endpoints: {
      health: '/api/health',
      swagger: '/api-docs',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile'
      },
      solicitudes: {
        list: 'GET /api/solicitudes',
        get: 'GET /api/solicitudes/:id',
        create: 'POST /api/solicitudes',
        update: 'PUT /api/solicitudes/:id',
        updateStatus: 'PUT /api/solicitudes/:id/estatus',
        delete: 'DELETE /api/solicitudes/:id',
        stats: 'GET /api/solicitudes/estadisticas'
      },
      catalogos: {
        tiposOficio: 'GET /api/catalogos/tipos-oficio',
        municipios: 'GET /api/catalogos/municipios',
        regiones: 'GET /api/catalogos/regiones',
        estatus: 'GET /api/catalogos/estatus'
      }
    }
  });
});

// Manejadores de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    console.log('🔄 Verificando conexión a la base de datos...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('⚠️  No se pudo conectar a la base de datos');
      console.log('💡 Asegúrate de:');
      console.log('   1. Tener MySQL en ejecución');
      console.log('   2. Configurar correctamente el archivo .env');
      console.log('   3. Ejecutar: npm run db:init');
      console.log('\n');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('\n🚀 Servidor SACC5i Backend iniciado');
      console.log(`📡 Puerto: ${PORT}`);

      console.log(`📚 Swagger: http://localhost:${PORT}/api-docs\n`);
    });

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de señales de terminación
process.on('SIGINT', () => {
  console.log('\nCerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nCerrando servidor...');
  process.exit(0);
});

// Iniciar
startServer();

export default app;
