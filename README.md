# SACC5i Backend

Backend para el Sistema de Atención a la Ciudadanía del C5i de Puebla.

## Tecnologías

- Node.js + Express
- MySQL con Promesas (mysql2)
- JWT para autenticación
- Bcrypt para encriptación
- Express Validator para validaciones

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
# Copiar el archivo de ejemplo
copy .env.example .env

# Editar .env con tus credenciales de MySQL
```

3. Crear la base de datos:
```bash
npm run db:init
```

4. Iniciar el servidor:
```bash
npm run dev
```

El servidor estará disponible en: http://localhost:5000

## Endpoints API

### Autenticación

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil del usuario (requiere token)

### Solicitudes

- `GET /api/solicitudes` - Listar todas las solicitudes del usuario
- `GET /api/solicitudes/:id` - Obtener una solicitud específica
- `POST /api/solicitudes` - Crear nueva solicitud
- `PUT /api/solicitudes/:id` - Actualizar solicitud
- `DELETE /api/solicitudes/:id` - Eliminar solicitud

### Catálogos

- `GET /api/catalogos/tipos-oficio` - Obtener tipos de oficio
- `GET /api/catalogos/municipios` - Obtener municipios
- `GET /api/catalogos/regiones` - Obtener regiones
- `GET /api/catalogos/estatus` - Obtener estatus de solicitudes

## Estructura del Proyecto

```
src/
├── config/           # Configuraciones (DB, etc)
├── controllers/      # Controladores de rutas
├── middlewares/      # Middlewares (auth, validación)
├── models/          # Modelos de datos
├── routes/          # Definición de rutas
├── utils/           # Utilidades y helpers
└── server.js        # Punto de entrada
```

## Base de Datos

La base de datos incluye las siguientes tablas:

- `usuarios` - Información de usuarios
- `solicitudes` - Solicitudes/trámites
- `tipos_oficio` - Catálogo de tipos de oficios
- `municipios` - Catálogo de municipios
- `regiones` - Catálogo de regiones
- `estatus_solicitudes` - Catálogo de estatus

## Seguridad

- Las contraseñas se encriptan con bcrypt
- Autenticación basada en JWT
- Validación de datos con express-validator
- CORS configurado para el frontend
