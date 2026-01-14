# 📥 Guía de Instalación de MySQL para Windows

## Opción 1: MySQL Installer (Recomendado)

### 1. Descargar MySQL
1. Visita: https://dev.mysql.com/downloads/installer/
2. Descarga **MySQL Installer for Windows**
3. Elige la versión "mysql-installer-community" (300+ MB)

### 2. Instalar MySQL
1. Ejecuta el instalador descargado
2. Selecciona "Developer Default" o "Server only"
3. Click en "Execute" para instalar
4. Configura el servidor:
   - Port: **3306** (dejar por defecto)
   - Root password: **Crea una contraseña segura** (recuérdala!)
   - Windows Service: Activar "Start MySQL Server at System Startup"
5. Click "Execute" para aplicar configuración
6. Finalizar instalación

### 3. Verificar Instalación

Abre PowerShell o CMD y ejecuta:
```bash
mysql --version
```

Deberías ver algo como:
```
mysql  Ver 8.0.35 for Win64 on x86_64
```

### 4. Probar Conexión
```bash
mysql -u root -p
```
Ingresa tu contraseña y deberías ver:
```
mysql>
```

Escribe `exit` para salir.

---

## Opción 2: XAMPP (Más Simple)

### 1. Descargar XAMPP
1. Visita: https://www.apachefriends.org/download.html
2. Descarga XAMPP para Windows
3. Ejecuta el instalador

### 2. Instalar
1. Selecciona componentes (asegúrate de incluir MySQL)
2. Instalar en `C:\xampp` (recomendado)
3. Finalizar instalación

### 3. Iniciar MySQL
1. Abre "XAMPP Control Panel"
2. Click en "Start" junto a MySQL
3. El servidor estará corriendo

### 4. Credenciales por Defecto
- Usuario: `root`
- Contraseña: (vacía, sin contraseña)
- Puerto: `3306`

---

## Opción 3: MySQL Standalone (Avanzado)

### 1. Descargar
https://dev.mysql.com/downloads/mysql/

### 2. Instalar y Configurar
Sigue el asistente de instalación.

---

## ⚙️ Configurar el Backend SACC5i

Una vez instalado MySQL, edita el archivo `.env` en tu proyecto:

### Para MySQL Installer:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_que_creaste
DB_NAME=sacc5i_db
```

### Para XAMPP:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=sacc5i_db
```

---

## 🚀 Siguiente Paso: Inicializar Base de Datos

Una vez configurado el `.env`, ejecuta:

```bash
cd c:\Users\DELL\Desktop\SACC5i-Backend
npm run db:init
```

Esto creará automáticamente:
- La base de datos `sacc5i_db`
- Todas las tablas necesarias
- Datos iniciales (regiones, municipios, tipos de oficio, estatus)

---

## ✅ Verificar que Todo Funciona

```bash
npm run dev
```

Deberías ver:
```
✅ Conexión a MySQL exitosa
🚀 Servidor SACC5i Backend iniciado
📡 Puerto: 5000
🌐 URL: http://localhost:5000
```

---

## 🆘 Problemas Comunes

### MySQL no inicia
- Verifica que el servicio esté corriendo en "Servicios" de Windows
- O reinicia desde XAMPP Control Panel

### Error 1045: Access denied
- Verifica el usuario y contraseña en `.env`
- Asegúrate de que el usuario `root` tenga permisos

### Error 2003: Can't connect
- Verifica que MySQL esté corriendo
- Verifica el puerto (3306)

### No se crea la base de datos
- Ejecuta manualmente:
  ```bash
  mysql -u root -p
  CREATE DATABASE sacc5i_db;
  ```
- Luego ejecuta: `npm run db:init`

---

## 📱 Herramientas Útiles

### MySQL Workbench (GUI)
- Descargar: https://dev.mysql.com/downloads/workbench/
- Gestiona tu base de datos visualmente

### phpMyAdmin (incluido en XAMPP)
- Accede desde: http://localhost/phpmyadmin

### HeidiSQL (Alternativa)
- Descargar: https://www.heidisql.com/download.php

---

## 💡 Recomendación

Para desarrollo, **XAMPP es la opción más simple**:
- ✅ Instalación rápida
- ✅ No requiere configuración compleja
- ✅ Incluye phpMyAdmin
- ✅ Fácil de iniciar/detener

Para producción o uso profesional:
- ✅ MySQL Server oficial
- ✅ Mejor rendimiento
- ✅ Más opciones de configuración
