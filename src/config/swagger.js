import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SACC5i API - Sistema de Atención Ciudadana',
      version: '1.0.0',
      description: 'API REST para el Sistema de Atención a la Ciudadanía del C5i de Puebla',
      contact: {
        name: 'Gobierno de Puebla',
        url: 'https://puebla.gob.mx'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Servidor de Desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa el token JWT obtenido del login'
        }
      },
      schemas: {
        Usuario: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre_completo: { type: 'string', example: 'Yulissa Ortega' },
            usuario: { type: 'string', example: 'yulissa.ortega' },
            fecha_nacimiento: { type: 'string', format: 'date', example: '1995-05-15' },
            region: { type: 'string', example: 'Región III - Centro' },
            extension: { type: 'string', example: '1234' },
            rol: { type: 'string', enum: ['usuario', 'administrador', 'operador'], example: 'usuario' }
          }
        },
        Solicitud: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            numero_solicitud: { type: 'string', example: 'SACC5I-2026-000001' },
            tipo_oficio_id: { type: 'integer', example: 1, description: 'ID del tipo de oficio' },
            municipio_id: { type: 'integer', example: 1, description: 'ID del municipio' },
            dependencia: { type: 'string', example: 'Seguridad Pública Municipal', description: 'Dependencia solicitante' },
            proceso_movimiento: { type: 'string', example: 'ALTA', description: 'Tipo de movimiento: ALTA, BAJA, CONSULTA' },
            termino: { type: 'string', enum: ['Ordinario', 'Extraordinario'], example: 'Ordinario', description: 'Término para cumplir el trámite' },
            dias_horas: { type: 'string', example: '15 días', description: 'Plazo en días u horas' },
            fecha_sello_c5: { type: 'string', format: 'date', example: '2026-01-14', description: 'Fecha de sello en C5' },
            fecha_recibido_dt: { type: 'string', format: 'date', example: '2026-01-14', description: 'Fecha recibido en DT' },
            fecha_solicitud: { type: 'string', format: 'date', example: '2026-01-14', description: 'Fecha de la solicitud' },
            estatus_id: { type: 'integer', example: 1, description: 'ID del estatus actual' },
            observaciones: { type: 'string', example: 'Solicitud urgente', description: 'Observaciones adicionales' }
          },
          required: ['tipo_oficio_id', 'municipio_id', 'fecha_solicitud']
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error en la operación' }
          }
        }
      }
    },
    tags: [
      { name: 'Autenticación', description: 'Endpoints de registro y login' },
      { name: 'Admin', description: 'Gestión de usuarios (Solo Admin/Super Admin)' },
      { name: 'Trámites - ALTA', description: 'Módulo de trámites de ALTA (4 pasos del mockup)' },
      { name: 'Catálogos', description: 'Catálogos del sistema' },
      { name: 'Sistema', description: 'Información del sistema' }
    ]
  },
  apis: ['./src/routes/*.js', '!./src/routes/*.backup', '!./src/routes/*.old']
};

export default swaggerJsdoc(options);
