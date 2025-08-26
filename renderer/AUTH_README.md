# Sistema de Autenticación - BACE Electron

## 📋 Resumen de la implementación

Se ha implementado un sistema completo de autenticación para la aplicación BACE usando React + TypeScript con TanStack Router y Zustand.

### 🔐 Características principales

- **Autenticación sin localStorage**: La sesión se mantiene solo en memoria y se limpia automáticamente al cerrar la aplicación
- **Protección de rutas**: Sistema de guards automático para rutas protegidas
- **Store global**: Zustand para manejo del estado de autenticación
- **Integración con Electron**: API segura a través de contextBridge
- **Validación de formularios**: Zod + React Hook Form
- **UI moderna**: Componentes con Tailwind CSS

### 🗂️ Estructura de archivos

```
renderer/src/
├── store/
│   └── auth.ts                    # Store de Zustand para autenticación
├── features/auth/
│   ├── AuthService.ts            # Servicio de autenticación
│   ├── types.ts                  # Tipos TypeScript
│   ├── auth-layout.tsx           # Layout para páginas de auth
│   ├── index.tsx                 # Exports principales
│   └── login/
│       ├── index.tsx             # Página de login
│       └── components/
│           └── user-auth-form.tsx # Formulario de login
├── routes/
│   ├── __root.tsx                # Layout raíz
│   ├── index.tsx                 # Redirección principal
│   ├── (auth)/
│   │   └── iniciar-sesion.lazy.tsx # Ruta de login
│   ├── (errors)/                 # Páginas de error (401, 403, 404, 500, 503)
│   └── _authenticated/           # Rutas protegidas
│       ├── route.tsx             # Layout autenticado + guard
│       ├── index.tsx             # Dashboard
│       ├── clients.tsx
│       ├── products.tsx
│       ├── users.tsx
│       ├── orders.tsx
│       ├── configurations.tsx
│       └── history.tsx
└── hooks/
    └── use-auth.ts               # Hook personalizado de auth
```

### 🚀 Funcionalidades implementadas

#### ✅ Store de Autenticación (Zustand)
- **setUser()** - Establecer usuario autenticado
- **setBusiness()** - Establecer datos del negocio (preparado para futuro)
- **reset()** - Limpiar toda la sesión
- **isAuthenticated()** - Verificar estado de autenticación
- **Sin localStorage** - Todo en memoria, se limpia al cerrar la app

#### ✅ Servicio de Autenticación
- **login()** - Login con username/password
- **logout()** - Cerrar sesión
- **getCurrentUser()** - Obtener usuario actual
- **isAuthenticated()** - Verificar autenticación
- **checkAuthStatus()** - Sincronizar estado con backend

#### ✅ Sistema de Rutas
- **Protección automática**: Guard en rutas `/_authenticated/`
- **Redirección inteligente**: Login → Dashboard, No autenticado → Login
- **Páginas de error**: 401, 403, 404, 500, 503
- **Estructura organizada**: Separación clara auth vs. rutas protegidas

#### ✅ Componentes de UI
- **AuthLayout**: Layout común para páginas de autenticación
- **UserAuthForm**: Formulario de login con validación
- **Error boundaries**: Manejo de errores por código HTTP
- **Dashboard**: Página principal con información del usuario

#### ✅ Backend Integration
- **Sesión en memoria**: El backend mantiene `currentUser` solo en memoria
- **Auto-logout**: La app limpia la sesión automáticamente al cerrarse
- **API segura**: Todas las llamadas a través de contextBridge

### 🛠️ Configuración técnica

#### Dependencias principales
- `@tanstack/react-router` - Enrutamiento
- `zustand` - Estado global
- `zod` - Validación de esquemas
- `react-hook-form` - Manejo de formularios
- `@hookform/resolvers` - Integración Zod + RHF
- `sonner` - Notificaciones toast

#### Scripts disponibles
```bash
npm run dev     # Desarrollo
npm run build   # Construcción
npm run lint    # Linting
```

### 🔧 Cómo usar

1. **Iniciar la aplicación**
   ```bash
   cd renderer
   npm run dev
   ```

2. **Login**
   - La aplicación redirige automáticamente a `/iniciar-sesion`
   - Usar credenciales configuradas en la base de datos SQLite
   - Después del login exitoso, redirige al dashboard

3. **Navegación**
   - Todas las rutas principales están protegidas
   - Sidebar actualizado con las nuevas rutas `/_authenticated/`
   - Logout disponible en el header del dashboard

4. **Cierre de sesión**
   - Manual: Botón "Cerrar sesión" en el dashboard
   - Automático: Al cerrar la aplicación Electron

### 🔒 Seguridad

- **Sin persistencia local**: No se guarda nada en localStorage/sessionStorage
- **Sesión en memoria**: Se limpia automáticamente al cerrar la app
- **Validación de rutas**: Guards automáticos en todas las rutas protegidas
- **API segura**: contextBridge para comunicación Electron
- **Verificación periódica**: Check de autenticación cada 5 minutos

### 📝 Próximos pasos (opcionales)

- [ ] Implementar recuperación de contraseña
- [ ] Agregar "Remember me" (opcional, con configuración)
- [ ] Sistema de permisos granulares
- [ ] Multi-tenant / múltiples empresas
- [ ] Logs de auditoría

### 🐛 Solución de problemas

1. **Error "Module not found"**: Ejecutar `npm install` en la carpeta `renderer`
2. **Rutas no funcionan**: Regenerar con `npm run dev` (TanStack Router auto-genera)
3. **Autenticación no persiste**: Es normal, está diseñado para no persistir
4. **Errores de TypeScript**: Verificar que todos los tipos estén importados correctamente

### 📚 Documentación adicional

- [TanStack Router](https://tanstack.com/router)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
