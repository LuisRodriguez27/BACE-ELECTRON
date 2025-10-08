# 🚀 Guía de Instalación - 2 Instaladores (Servidor y Clientes)

## 📋 Información de tu Red

- **PC SERVIDOR**: `192.168.50.1`
- **PC CLIENTE 1**: `192.168.50.2`
- **PC CLIENTE 2**: `192.168.50.3`

---

## 🎯 Proceso Completo

### PASO 1: Generar Instalador para PC SERVIDOR

**1.1 Edita `electron/db.js`:**

```javascript
const CONFIG = {
  modo: 'local',  // ← Modo LOCAL para servidor
  serverIP: '192.168.50.1',
  serverUser: 'Luis'  // ← Pon tu usuario de Windows aquí
};
```

**1.2 Genera el instalador:**

```powershell
npm run dist:win
```

**1.3 Renombra el instalador:**

```
dist\BACE Setup 1.0.0.exe  →  BACE-SERVIDOR.exe
```

**1.4 Guarda el instalador en un USB o carpeta segura**

---

### PASO 2: Generar Instalador para PCs CLIENTES

**2.1 Edita `electron/db.js`:**

```javascript
const CONFIG = {
  modo: 'network',  // ← Modo NETWORK para clientes
  serverIP: '192.168.50.1',
  serverUser: 'Luis'  // ← El mismo usuario del servidor
};
```

**2.2 Genera el instalador:**

```powershell
npm run dist:win
```

**2.3 Renombra el instalador:**

```
dist\BACE Setup 1.0.0.exe  →  BACE-CLIENTE.exe
```

---

### PASO 3: Configurar PC SERVIDOR (192.168.50.1)

**3.1 Instalar BACE:**
- Ejecuta `BACE-SERVIDOR.exe`
- Siguiente → Siguiente → Instalar

**3.2 Primera ejecución:**
- Abre BACE
- Crea tu primer usuario
- Agrega algunos datos de prueba (1 cliente, 1 producto)
- Cierra BACE

**3.3 Compartir la carpeta de la base de datos:**

```
1. Abre el Explorador de Windows
2. Pega en la barra de dirección: %APPDATA%
3. Verás la carpeta: bace-electron
4. Click derecho en la carpeta "bace-electron" → Propiedades
5. Pestaña "Compartir" → botón "Compartir"
6. En el menú desplegable, selecciona "Todos" → Agregar
7. Cambia el nivel de permisos a "Lectura y escritura"
8. Click "Compartir" → "Listo"
```

**3.4 (IMPORTANTE) Desactivar uso compartido protegido:**

```
1. Panel de Control → Centro de redes y recursos compartidos
2. Click en "Cambiar configuración de uso compartido avanzado" (izquierda)
3. Expandir "Todas las redes"
4. Seleccionar "Desactivar el uso compartido con protección por contraseña"
5. Guardar cambios
```

**3.5 Verificar que funciona:**
- La ruta debe ser: `C:\Users\Luis\AppData\Roaming\bace-electron\database\data.db`
- Anota esta ruta, la necesitarás para verificar

---

### PASO 4: Configurar PCs CLIENTES (.2 y .3)

**4.1 Instalar BACE:**
- Ejecuta `BACE-CLIENTE.exe` en cada PC cliente
- Siguiente → Siguiente → Instalar

**4.2 Abrir BACE:**
- Deberías ver automáticamente los datos del servidor
- Verifica que aparezca el cliente y producto que creaste en el servidor

**4.3 Prueba:**
- En PC Cliente 1: Crea un nuevo cliente "Prueba Cliente 1"
- En PC Cliente 2: Verifica que aparece
- En PC Servidor: Verifica que aparece

✅ **Si ves los mismos datos en las 3 PCs, ¡FUNCIONA PERFECTAMENTE!**

---

## 🔍 Verificación de la Ruta de Red

En cualquier PC CLIENTE, puedes probar la conexión:

**Desde el Explorador de Windows:**
```
\\192.168.50.1\Users\Luis\AppData\Roaming\bace-electron\database\data.db
```

Si puedes ver el archivo `data.db`, la conexión funciona. ✅

---

## 📝 Resumen de Rutas

| PC | Modo | Ruta de la Base de Datos |
|----|------|--------------------------|
| **Servidor (.1)** | Local | `C:\Users\Luis\AppData\Roaming\bace-electron\database\data.db` |
| **Cliente 1 (.2)** | Red | `\\192.168.50.1\Users\Luis\AppData\Roaming\bace-electron\database\data.db` |
| **Cliente 2 (.3)** | Red | `\\192.168.50.1\Users\Luis\AppData\Roaming\bace-electron\database\data.db` |

---

## ⚠️ IMPORTANTE

### ✅ Ventajas de este método:
- No necesitas crear carpeta compartida extra
- La base de datos está en su ubicación estándar
- El servidor trabaja local (más rápido)
- Los clientes acceden por red

### ⚡ Consideraciones:
- **La PC servidor DEBE estar encendida** para que los clientes funcionen
- Si cambias el usuario de Windows del servidor, debes regenerar `BACE-CLIENTE.exe`
- Mantén respaldos regulares de la carpeta `bace-electron`

---

## 🆘 Solución de Problemas

### ❌ Error en clientes: "No se puede abrir la base de datos"

**Verifica:**

1. **PC Servidor encendida**: Obviamente debe estar prendida

2. **Carpeta compartida correctamente**:
   - Abre explorador en PC cliente
   - Pega: `\\192.168.50.1\Users\Luis\AppData\Roaming\bace-electron`
   - ¿Puedes verla? ✅ / ¿No puedes? ❌

3. **Firewall**:
   ```
   Panel de Control → Firewall de Windows
   → Permitir una aplicación a través de firewall
   → Marcar "Uso compartido de archivos e impresoras"
   ```

4. **Uso compartido desactivado**:
   - Verifica que desactivaste "protección por contraseña"

### ❌ Pide usuario y contraseña

- Repite el paso 3.4 (Desactivar uso compartido protegido)

### ❌ PC Servidor también muestra la ruta de red

- Regeneraste mal el instalador, debe estar en modo `'local'`

---

## 📦 Checklist Final

### En PC Servidor:
- [ ] `electron/db.js` configurado con `modo: 'local'`
- [ ] Instalador generado: `BACE-SERVIDOR.exe`
- [ ] BACE instalado y ejecutado al menos una vez
- [ ] Carpeta `bace-electron` compartida con "Todos"
- [ ] Permisos de "Lectura y escritura" activados
- [ ] Uso compartido protegido DESACTIVADO

### En PCs Clientes:
- [ ] `electron/db.js` configurado con `modo: 'network'`
- [ ] IP correcta: `192.168.50.1`
- [ ] Usuario correcto en `serverUser`
- [ ] Instalador generado: `BACE-CLIENTE.exe`
- [ ] BACE instalado
- [ ] Datos del servidor visibles ✅

---

## 🎉 ¡Listo para Producción!

Una vez que todo funciona:
- Guarda ambos instaladores en un lugar seguro
- Documenta la IP del servidor
- Configura respaldos automáticos de `bace-electron\database`

**¡Disfruta tu sistema multi-usuario!** 🚀
