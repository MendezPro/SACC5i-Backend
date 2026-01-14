# 🚀 Inicio Rápido - SACC5i Backend

## ⚡ Configuración en 3 Pasos

### 1️⃣ Configurar MySQL
Edita el archivo `.env` y cambia la contraseña de MySQL:

```env
DB_PASSWORD=tu_password_aqui
```

### 2️⃣ Inicializar Base de Datos
```bash
npm run db:init
```

### 3️⃣ Iniciar Servidor
```bash
npm run dev
```

✅ **¡Listo!** El servidor estará en: http://localhost:5000

---

## 🧪 Probar que Funciona

### Opción 1: Navegador
Abre: http://localhost:5000

### Opción 2: Script de Prueba
```bash
node test-api.js
```

### Opción 3: curl
```bash
curl http://localhost:5000/api/health
```

---

## 📚 Primer Uso de la API

### 1. Registrar un Usuario
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"nombre_completo\":\"Tu Nombre\",\"usuario\":\"tunombre\",\"password\":\"123456\"}"
```

### 2. Iniciar Sesión
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"usuario\":\"tunombre\",\"password\":\"123456\"}"
```

Guarda el `token` de la respuesta.

### 3. Crear una Solicitud
```bash
curl -X POST http://localhost:5000/api/solicitudes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d "{\"tipo_oficio_id\":1,\"fecha_solicitud\":\"2026-01-14\",\"observaciones\":\"Mi primera solicitud\"}"
```

### 4. Ver tus Solicitudes
```bash
curl http://localhost:5000/api/solicitudes \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## 📖 Documentación Completa

- [README.md](./README.md) - Visión general
- [SETUP.md](./SETUP.md) - Guía de configuración detallada
- [API_EXAMPLES.md](./API_EXAMPLES.md) - Ejemplos de todos los endpoints
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del sistema

---

## ❓ Problemas Comunes

### "Cannot connect to MySQL"
- ✅ Verifica que MySQL esté corriendo
- ✅ Revisa las credenciales en `.env`

### "Database does not exist"
- ✅ Ejecuta: `npm run db:init`

### "Port 5000 already in use"
- ✅ Cambia el puerto en `.env`: `PORT=5001`

---

## 🔗 URLs Importantes

- **API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health
- **Frontend**: http://localhost:3000 (tu React app)

---

## 🎯 Próximos Pasos

1. ✅ Backend corriendo en puerto 5000
2. 🔄 Conectar tu frontend React
3. 📱 Probar login y registro desde el frontend
4. 🎨 Implementar las pantallas de solicitudes

---

## 💡 Consejos

- El token JWT expira en 7 días
- Usa Postman o Thunder Client para probar la API
- Revisa la consola del servidor para ver los logs
- Los números de solicitud se generan automáticamente

---

## 🆘 Soporte

Si algo no funciona:
1. Verifica que MySQL esté corriendo
2. Revisa los logs en la consola
3. Asegúrate de haber ejecutado `npm run db:init`
4. Verifica que el puerto 5000 esté libre

---

**¡Feliz codificación! 🎉**
