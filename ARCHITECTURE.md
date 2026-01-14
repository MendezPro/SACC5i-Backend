# Estructura del Proyecto SACC5i Backend

```
SACC5i-Backend/
│
├── src/
│   ├── config/              # Configuraciones
│   │   ├── database.js      # Conexión a MySQL con pool
│   │   └── initDB.js        # Script de inicialización de BD
│   │
│   ├── controllers/         # Lógica de negocio
│   │   ├── authController.js        # Autenticación (registro, login)
│   │   ├── solicitudesController.js # CRUD de solicitudes
│   │   └── catalogosController.js   # Catálogos del sistema
│   │
│   ├── middlewares/         # Middlewares personalizados
│   │   ├── authMiddleware.js       # Verificación de JWT
│   │   ├── validationMiddleware.js # Manejo de validaciones
│   │   └── errorMiddleware.js      # Manejo de errores
│   │
│   ├── models/             # Modelos (actualmente usando queries directas)
│   │
│   ├── routes/             # Definición de rutas
│   │   ├── authRoutes.js         # Rutas de autenticación
│   │   ├── solicitudesRoutes.js  # Rutas de solicitudes
│   │   ├── catalogosRoutes.js    # Rutas de catálogos
│   │   └── index.js              # Enrutador principal
│   │
│   ├── validators/         # Validadores con express-validator
│   │   ├── authValidators.js      # Validaciones de auth
│   │   └── solicitudValidators.js # Validaciones de solicitudes
│   │
│   ├── utils/              # Utilidades y helpers
│   │   ├── helpers.js      # Funciones auxiliares
│   │   └── responses.js    # Helpers de respuestas HTTP
│   │
│   └── server.js           # Punto de entrada de la aplicación
│
├── uploads/                # Carpeta para archivos subidos
│   └── .gitkeep
│
├── node_modules/           # Dependencias (generado por npm)
│
├── .env                    # Variables de entorno (NO SUBIR A GIT)
├── .env.example            # Ejemplo de variables de entorno
├── .gitignore             # Archivos ignorados por Git
├── package.json           # Dependencias y scripts
├── README.md              # Documentación principal
├── SETUP.md               # Guía de configuración
├── API_EXAMPLES.md        # Ejemplos de uso de la API
└── test-api.js            # Script de pruebas

```

## Descripción de Carpetas

### 📁 src/config/
Archivos de configuración del sistema:
- **database.js**: Pool de conexiones MySQL
- **initDB.js**: Crea tablas y datos iniciales

### 📁 src/controllers/
Lógica de negocio de cada módulo:
- **authController.js**: Registro, login, perfil, cambio de contraseña
- **solicitudesController.js**: CRUD completo de solicitudes + estadísticas
- **catalogosController.js**: Obtención de catálogos (tipos, municipios, regiones, estatus)

### 📁 src/middlewares/
Middlewares reutilizables:
- **authMiddleware.js**: Verifica token JWT en rutas protegidas
- **validationMiddleware.js**: Procesa validaciones de express-validator
- **errorMiddleware.js**: Maneja errores globales

### 📁 src/routes/
Definición de endpoints:
- **authRoutes.js**: `/api/auth/*`
- **solicitudesRoutes.js**: `/api/solicitudes/*`
- **catalogosRoutes.js**: `/api/catalogos/*`
- **index.js**: Enrutador principal que combina todos

### 📁 src/validators/
Validaciones con express-validator:
- **authValidators.js**: Validaciones para registro y login
- **solicitudValidators.js**: Validaciones para crear/actualizar solicitudes

### 📁 src/utils/
Funciones auxiliares:
- **helpers.js**: Funciones de utilidad general
- **responses.js**: Helpers para respuestas HTTP consistentes

### 📄 server.js
Punto de entrada que:
- Configura Express
- Aplica middlewares globales (CORS, JSON, etc.)
- Registra rutas
- Maneja errores
- Inicia el servidor

## Base de Datos MySQL

### Tablas Principales

#### 1. usuarios
Almacena información de usuarios del sistema.

```sql
- id (INT, PK, AUTO_INCREMENT)
- nombre_completo (VARCHAR 150)
- usuario (VARCHAR 50, UNIQUE)
- password (VARCHAR 255) - Encriptada con bcrypt
- fecha_nacimiento (DATE)
- region (VARCHAR 100)
- extension (VARCHAR 20)
- rol (ENUM: usuario, administrador, operador)
- activo (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

#### 2. solicitudes
Gestiona las solicitudes ciudadanas.

```sql
- id (INT, PK, AUTO_INCREMENT)
- numero_solicitud (VARCHAR 50, UNIQUE) - Ej: SACC5I-2026-000001
- usuario_id (INT, FK → usuarios)
- tipo_oficio_id (INT, FK → tipos_oficio)
- municipio_id (INT, FK → municipios)
- region (VARCHAR 100)
- proceso_movimiento (VARCHAR 255)
- termino (VARCHAR 100)
- dias_horas (VARCHAR 50)
- fecha_sello_c5 (DATE)
- fecha_recibido_dt (DATE)
- fecha_solicitud (DATE)
- estatus_id (INT, FK → estatus_solicitudes)
- observaciones (TEXT)
- created_at, updated_at (TIMESTAMP)
```

#### 3. historial_solicitudes
Registra todos los cambios de estatus.

```sql
- id (INT, PK, AUTO_INCREMENT)
- solicitud_id (INT, FK → solicitudes)
- usuario_id (INT, FK → usuarios)
- estatus_anterior_id (INT, FK → estatus_solicitudes)
- estatus_nuevo_id (INT, FK → estatus_solicitudes)
- comentario (TEXT)
- created_at (TIMESTAMP)
```

#### 4. tipos_oficio (Catálogo)
```sql
- id, nombre, descripcion, created_at
```

#### 5. municipios (Catálogo)
```sql
- id, nombre, region_id, created_at
```

#### 6. regiones (Catálogo)
```sql
- id, nombre, created_at
```

#### 7. estatus_solicitudes (Catálogo)
```sql
- id, nombre, descripcion, color, created_at
```

## Flujo de Autenticación

1. **Registro**: `POST /api/auth/register`
   - Valida datos
   - Encripta contraseña con bcrypt
   - Guarda usuario en BD
   - Genera token JWT
   - Retorna usuario + token

2. **Login**: `POST /api/auth/login`
   - Busca usuario por username
   - Verifica contraseña
   - Genera token JWT
   - Retorna usuario + token

3. **Rutas Protegidas**:
   - Cliente envía: `Authorization: Bearer {token}`
   - Middleware verifica token
   - Agrega `req.userId` al request
   - Continúa a la ruta

## Flujo de Solicitudes

1. **Crear Solicitud**:
   - Genera número único (SACC5I-2026-XXXXXX)
   - Guarda en BD con estatus "Pendiente"
   - Registra en historial

2. **Actualizar Estatus**:
   - Obtiene estatus actual
   - Actualiza a nuevo estatus
   - Registra cambio en historial con comentario

3. **Consultar Solicitudes**:
   - Lista solicitudes del usuario autenticado
   - Permite filtros (estatus, tipo, fechas, búsqueda)
   - Incluye información relacionada (JOIN con catálogos)

## Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 18+ | Runtime de JavaScript |
| Express | 4.18+ | Framework web |
| MySQL2 | 3.6+ | Conexión a MySQL con promesas |
| jsonwebtoken | 9.0+ | Autenticación JWT |
| bcryptjs | 2.4+ | Encriptación de contraseñas |
| express-validator | 7.0+ | Validación de datos |
| cors | 2.8+ | Cross-Origin Resource Sharing |
| dotenv | 16.3+ | Variables de entorno |
| multer | 1.4+ | Subida de archivos |

## Variables de Entorno

```env
PORT                # Puerto del servidor (5000)
NODE_ENV           # Entorno (development/production)
DB_HOST            # Host de MySQL (localhost)
DB_PORT            # Puerto de MySQL (3306)
DB_USER            # Usuario de MySQL
DB_PASSWORD        # Contraseña de MySQL
DB_NAME            # Nombre de la BD (sacc5i_db)
JWT_SECRET         # Clave secreta para JWT
JWT_EXPIRES_IN     # Tiempo de expiración del token (7d)
FRONTEND_URL       # URL del frontend para CORS
```

## Scripts NPM

```json
"dev"      - Inicia en modo desarrollo con auto-reload
"start"    - Inicia en modo producción
"db:init"  - Inicializa la base de datos
```

## Endpoints de la API

### Autenticación (Públicas)
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login

### Autenticación (Protegidas)
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil
- `PUT /api/auth/change-password` - Cambiar contraseña

### Solicitudes (Todas protegidas)
- `GET /api/solicitudes` - Listar solicitudes
- `GET /api/solicitudes/estadisticas` - Estadísticas
- `GET /api/solicitudes/:id` - Obtener solicitud
- `POST /api/solicitudes` - Crear solicitud
- `PUT /api/solicitudes/:id` - Actualizar solicitud
- `PUT /api/solicitudes/:id/estatus` - Actualizar estatus
- `DELETE /api/solicitudes/:id` - Eliminar solicitud

### Catálogos (Todas protegidas)
- `GET /api/catalogos/tipos-oficio` - Tipos de oficio
- `GET /api/catalogos/municipios` - Municipios
- `GET /api/catalogos/regiones` - Regiones
- `GET /api/catalogos/estatus` - Estatus

### Sistema
- `GET /api/health` - Estado del servidor

## Próximas Mejoras Sugeridas

1. **Roles y Permisos**: Implementar control de acceso basado en roles
2. **Paginación**: Agregar paginación a listados grandes
3. **Búsqueda Avanzada**: Mejorar filtros de búsqueda
4. **Notificaciones**: Sistema de notificaciones en tiempo real
5. **Reportes**: Generación de reportes en PDF/Excel
6. **Auditoría**: Registro completo de acciones de usuarios
7. **Caché**: Implementar Redis para catálogos
8. **WebSockets**: Actualización en tiempo real del estatus
9. **Tests**: Agregar tests unitarios e integración
10. **Documentación**: Swagger/OpenAPI para la API
