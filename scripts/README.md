# Scripts de Utilidades

Esta carpeta contiene scripts de mantenimiento para el desarrollo.

## ⚠️ IMPORTANTE: Solo para desarrollo

Estos scripts **NO** deben ejecutarse en producción.

---

## 📋 Scripts disponibles

### `limpiar-tramites.js`

**Propósito:** Eliminar todos los trámites de prueba para empezar con datos limpios.

**Elimina:**
- ❌ Todos los trámites
- ❌ Todas las personas de trámites
- ❌ Todo el historial de trámites

**Preserva:**
- ✅ Usuarios (puedes seguir haciendo login)
- ✅ Catálogos (puestos, municipios, dependencias, etc.)

**Uso:**
```bash
npm run limpiar:tramites
```

El script pedirá confirmación antes de ejecutarse. Debes escribir "SI" para confirmar.

**Cuándo usar:**
- Cuando tienes muchos datos de prueba antiguos
- Antes de empezar un nuevo flujo de pruebas
- Cuando quieres verificar el sistema desde cero

**⚠️ Advertencia:**
Esta acción es **IRREVERSIBLE**. Los datos eliminados no se pueden recuperar.

---

## 🔒 Protecciones de seguridad

Todos los scripts incluyen:
1. **Confirmación manual** antes de ejecutarse
2. **Bloqueo en producción** (si `NODE_ENV=production`)
3. **Resumen de cambios** antes y después

---

## 📝 Cómo agregar nuevos scripts

1. Crea el archivo en esta carpeta: `scripts/mi-script.js`
2. Agrega el comando en `package.json`:
   ```json
   "scripts": {
     "mi:comando": "node scripts/mi-script.js"
   }
   ```
3. Documenta el script en este README
4. Incluye protecciones de seguridad si modifica datos
