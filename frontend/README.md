# Frontend - doublePlay

Frontend de la aplicación doublePlay construido con Angular 19 (componentes standalone).

**Resumen**: Esta aplicación Angular consume la API del backend (por defecto `http://localhost:3000/api`) y ofrece catálogo, detalle, autenticación, perfil, búsqueda y una pequeña sección social y de administración.

**Estructura principal**
- **src/app**: código de la app (rutas, configuración, páginas, componentes y servicios).
- **src/environments**: variables de entorno (`apiUrl` en desarrollo apunta a `http://localhost:3000/api`).
- **cypress**: pruebas E2E (configuración y tests under `cypress/e2e`).

**Rutas principales**: definidas en [src/app/app.routes.ts](src/app/app.routes.ts)
- `/home`, `/movies`, `/movies/:id`, `/games`, `/games/:id`, `/login`, `/register`, `/reset-password`, `/profile`, `/social`, `/ai`, `/admin` (el acceso a `/admin` está protegido por `adminGuard`).

**Servicios y utilidades clave**
- **AuthService**: login, registro, recuperación y manejo del token en localStorage (`src/app/core/services/auth.service.ts`).
- **SearchService**: búsqueda combinada de películas y juegos (usa los endpoints `/movies` y `/games`).
- **ProfileService / SocialService**: lógica de perfil y social (en `src/app/core/services`).
- **Auth interceptor**: añade `Authorization: Bearer <token>` a las peticiones HTTP (`src/app/core/interceptors/auth.interceptor.ts`).

**Componentes reutilizables**
- `sidebar` y `search-dropdown` en `src/app/core/components` (componentes standalone usados en el shell).

**Configuración de la app**
- El bootstrap de la app está configurado con providers en `src/app/app.config.ts`, que registra las rutas y el `HttpClient` con el interceptor.

**Scripts (package.json)**
- `npm start` — arranca el servidor de desarrollo (ng serve) en el host 0.0.0.0:4200.
- `npm run build` — construye la app para producción.
- `npm run watch` — build en modo watch.
- `npm test` — ejecuta los tests unitarios.

**Dependencias principales**
- Angular 19, Bootstrap 5, Chart.js, RxJS.

**Pruebas E2E**
- Cypress está configurado y hay tests de autenticación en `cypress/e2e/auth`.

**Requisitos**
- Node.js 18+ y npm 9+.

**Instalación y uso rápido**
1. Ir a la carpeta del frontend:

```bash
cd frontend
```
2. Instalar dependencias:

```bash
npm install
```
3. Arrancar en desarrollo:

```bash
npm start
```

La app quedará disponible en http://localhost:4200/ y por defecto consulta la API en `http://localhost:3000/api` (ver `src/environments/environment.ts`).

