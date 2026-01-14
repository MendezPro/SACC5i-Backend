# Guía de Configuración - SACC5i Backend

## Requisitos Previos

- **Node.js**: versión 18 o superior
- **MySQL**: versión 8 o superior
- **npm** o **yarn**

## Pasos de Instalación

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar MySQL

Asegúrate de tener MySQL en ejecución. Puedes verificarlo con:

```bash
mysql --version
```

### 3. Configurar Variables de Entorno

Edita el archivo `.env` y configura tus credenciales de MySQL:

```env
# Servidor
PORT=5000
NODE_ENV=development

# Base de datos - CONFIGURA ESTOS VALORES
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_de_mysql
DB_NAME=sacc5i_db

# JWT (puedes dejar este valor o cambiarlo)
JWT_SECRET=sacc5i_super_secret_key_2026_change_in_production
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:3000
```

### 4. Crear e Inicializar la Base de Datos

Ejecuta el siguiente comando para crear todas las tablas y datos iniciales:

```bash
npm run db:init
```

Este comando creará:
- Base de datos `sacc5i_db`
- Todas las tablas necesarias
- Datos iniciales (regiones, municipios, tipos de oficio, estatus)

### 5. Iniciar el Servidor

```bash
npm run dev
```

El servidor estará disponible en: **http://localhost:5000**

## Verificación

### Probar que el servidor funciona

Abre tu navegador o usa curl:

```bash
curl http://localhost:5000/api/health
```

Deberías recibir:
```json
{
  "success": true,
  "message": "API SACC5i funcionando correctamente",
  "timestamp": "2026-01-14T..."
}
```

## Estructura de la Base de Datos

El sistema creará las siguientes tablas:

1. **usuarios** - Información de usuarios del sistema
2. **solicitudes** - Solicitudes/trámites ciudadanos
3. **tipos_oficio** - Catálogo de tipos de oficios
4. **municipios** - Catálogo de municipios de Puebla
5. **regiones** - Catálogo de regiones
6. **estatus_solicitudes** - Catálogo de estatus
7. **historial_solicitudes** - Historial de cambios de estatus

## Datos Iniciales

### Regiones Preconfiguradas
- Región I - Norte
- Región II - Nororiental
- Región III - Centro
- Región IV - Sur
- Región V - Occidente

### Municipios Iniciales
- Puebla
- Tehuacán
- Atlixco
- San Martín Texmelucan
- Cholula
- Huauchinango
- Teziutlán

### Tipos de Oficio
- Alta
- Baja
- Consulta
- Modificación
- Reporte
- Queja
- Sugerencia

### Estatus
- Pendiente
- En Proceso
- En Revisión
- Aprobada
- Rechazada
- Completada
- Cancelada

## Solución de Problemas

### Error: "Cannot connect to MySQL"

1. Verifica que MySQL esté en ejecución
2. Comprueba las credenciales en `.env`
3. Asegúrate de que el puerto MySQL sea el correcto (3306 por defecto)

### Error: "Database does not exist"

Ejecuta: `npm run db:init`

### Error: "Port 5000 already in use"

Cambia el puerto en `.env`:
```env
PORT=5001
```

### Error: "JWT_SECRET is not defined"

Asegúrate de que el archivo `.env` existe y tiene el valor `JWT_SECRET`

## Comandos Disponibles

```bash
# Desarrollo con auto-reload
npm run dev

# Producción
npm start

# Inicializar/reinicializar base de datos
npm run db:init
```

## Seguridad en Producción

Antes de desplegar en producción, asegúrate de:

1. Cambiar `JWT_SECRET` por un valor aleatorio y seguro
2. Configurar `NODE_ENV=production`
3. Usar HTTPS
4. Configurar un firewall para MySQL
5. Usar variables de entorno del servidor, no el archivo `.env`
6. Cambiar las credenciales de MySQL por unas seguras

## Integración con Frontend

El backend está configurado para aceptar peticiones desde `http://localhost:3000`.

Para integrarlo con tu frontend React:

```javascript
// Ejemplo de petición desde React
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    usuario: 'usuario',
    password: 'password'
  })
});

const data = await response.json();
console.log(data.data.token); // Token JWT
```

Guarda el token y úsalo en las siguientes peticiones:

```javascript
const response = await fetch('http://localhost:5000/api/solicitudes', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Soporte

Para más información, revisa:
- [README.md](./README.md) - Documentación general
- [API_EXAMPLES.md](./API_EXAMPLES.md) - Ejemplos de uso de la API
