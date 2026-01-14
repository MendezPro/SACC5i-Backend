# Ejemplos de Uso de la API SACC5i

## 1. Registro de Usuario

```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "nombre_completo": "Yulissa Ortega",
  "usuario": "yulissa.ortega",
  "password": "password123",
  "fecha_nacimiento": "1995-05-15",
  "region": "Región III - Centro",
  "extension": "1234"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "id": 1,
    "nombre_completo": "Yulissa Ortega",
    "usuario": "yulissa.ortega",
    "region": "Región III - Centro",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 2. Iniciar Sesión

```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "usuario": "yulissa.ortega",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "id": 1,
    "nombre_completo": "Yulissa Ortega",
    "usuario": "yulissa.ortega",
    "region": "Región III - Centro",
    "extension": "1234",
    "rol": "usuario",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 3. Obtener Perfil (Requiere Token)

```bash
GET http://localhost:5000/api/auth/profile
Authorization: Bearer {tu_token_aqui}
```

## 4. Obtener Catálogos

### Tipos de Oficio
```bash
GET http://localhost:5000/api/catalogos/tipos-oficio
Authorization: Bearer {tu_token_aqui}
```

### Municipios
```bash
GET http://localhost:5000/api/catalogos/municipios
Authorization: Bearer {tu_token_aqui}
```

### Regiones
```bash
GET http://localhost:5000/api/catalogos/regiones
Authorization: Bearer {tu_token_aqui}
```

### Estatus
```bash
GET http://localhost:5000/api/catalogos/estatus
Authorization: Bearer {tu_token_aqui}
```

## 5. Crear Nueva Solicitud

```bash
POST http://localhost:5000/api/solicitudes
Authorization: Bearer {tu_token_aqui}
Content-Type: application/json

{
  "tipo_oficio_id": 1,
  "municipio_id": 1,
  "region": "Región III - Centro",
  "proceso_movimiento": "Alta de nueva cámara de seguridad",
  "termino": "30 días",
  "dias_horas": "720 horas",
  "fecha_sello_c5": "2026-01-14",
  "fecha_recibido_dt": "2026-01-14",
  "fecha_solicitud": "2026-01-14",
  "observaciones": "Solicitud urgente para zona centro"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Solicitud creada exitosamente",
  "data": {
    "id": 1,
    "numero_solicitud": "SACC5I-2026-000001"
  }
}
```

## 6. Listar Solicitudes

```bash
GET http://localhost:5000/api/solicitudes
Authorization: Bearer {tu_token_aqui}
```

### Con Filtros
```bash
GET http://localhost:5000/api/solicitudes?estatus=1&tipo_oficio=2&busqueda=cámara
Authorization: Bearer {tu_token_aqui}
```

## 7. Obtener Solicitud Específica

```bash
GET http://localhost:5000/api/solicitudes/1
Authorization: Bearer {tu_token_aqui}
```

## 8. Actualizar Solicitud

```bash
PUT http://localhost:5000/api/solicitudes/1
Authorization: Bearer {tu_token_aqui}
Content-Type: application/json

{
  "observaciones": "Actualización: solicitud aprobada por supervisor",
  "termino": "20 días"
}
```

## 9. Actualizar Estatus de Solicitud

```bash
PUT http://localhost:5000/api/solicitudes/1/estatus
Authorization: Bearer {tu_token_aqui}
Content-Type: application/json

{
  "estatus_id": 2,
  "comentario": "Solicitud en proceso de atención"
}
```

## 10. Obtener Estadísticas

```bash
GET http://localhost:5000/api/solicitudes/estadisticas
Authorization: Bearer {tu_token_aqui}
```

## 11. Eliminar Solicitud

```bash
DELETE http://localhost:5000/api/solicitudes/1
Authorization: Bearer {tu_token_aqui}
```

## 12. Cambiar Contraseña

```bash
PUT http://localhost:5000/api/auth/change-password
Authorization: Bearer {tu_token_aqui}
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newPassword456"
}
```

## Notas Importantes

1. **Token de Autenticación**: Todas las rutas excepto registro y login requieren el token JWT en el header `Authorization: Bearer {token}`

2. **Formato de Fechas**: Usar formato ISO 8601: `YYYY-MM-DD`

3. **Números de Solicitud**: Se generan automáticamente con el formato `SACC5I-YYYY-XXXXXX`

4. **Estatus Disponibles**:
   - 1: Pendiente
   - 2: En Proceso
   - 3: En Revisión
   - 4: Aprobada
   - 5: Rechazada
   - 6: Completada
   - 7: Cancelada

5. **CORS**: El backend permite peticiones desde `http://localhost:3000` (configurable en `.env`)
