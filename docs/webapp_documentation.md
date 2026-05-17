# DOCUMENTATION

## URLs de acceso al API (Swagger) y al Front-end

## Credenciales de acceso (usuario y administrador)

## Diagrama de arquitectura de componentes

┌──────────────────────────────────────────────────────────────────────────────┐
│                                   USUARIO                                    │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        │ Navegador web
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND - Angular SPA                               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Angular + Bootstrap 5 + Chart.js                                       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Componentes principales del frontend:                                       │
│                                                                              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │ Catálogo      │ │ Auth / Perfil │ │ Social        │ │ Reviews       │     │
│  │ Películas     │ │ Login         │ │ Amigos        │ │ Valoraciones  │     │
│  │ Videojuegos   │ │ Registro      │ │ Feed          │ │ Respuestas    │     │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘     │
│                                                                              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────────────────┐   │
│  │ Chatbot IA    │ │ Panel Admin   │ │ Trailers embebidos                │   │
│  │ Recom.        │ │ Estadísticas  │ │ YouTube iframe / embed            │   │
│  └───────────────┘ └───────────────┘ └───────────────────────────────────┘   │
│                                                                              │
│  Arquitectura interna del frontend (capas):                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Capa UI (pages + shared components)                                    │  │
│  │ home · movies · games · social · profile · admin · ai-chat             │  │
│  │ sidebar · search-dropdown                                              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                  │
│                           ▼                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Capa App (router + seguridad)                                          │  │
│  │ app.routes.ts · admin.guard.ts · auth.interceptor.ts                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                  │
│                           ▼                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Capa Servicios (lógica de negocio)                                     │  │
│  │ auth.service.ts · profile.service.ts · social.service.ts               │  │
│  │ search.service.ts                                                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                  │
│                           ▼                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Estado y utilidades frontend                                           │  │
│  │ localStorage (token/userName) · RxJS · Chart.js (create/update/destroy)│  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        │ HTTP REST / JSON
                                        │ Authorization: Bearer JWT
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND - Node.js + Express                          │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ REST API Express                                                       │  │
│  │ JSON · CORS · Swagger · Middlewares                                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Middleware de seguridad                                                │  │
│  │ authRequired: verifica JWT                                             │  │
│  │ adminRequired: restringe endpoints de administración                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Rutas principales expuestas:                                                │
│                                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │ /auth      │ │ /movies    │ │ /games     │ │ /friends   │                 │
│  │ login      │ │ catálogo   │ │ catálogo   │ │ solicitudes│                 │
│  │ register   │ │ reviews    │ │ reviews    │ │ amigos     │                 │
│  │ recovery   │ │ wishlist   │ │ wishlist   │ │ búsqueda   │                 │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘                 │
│                                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │ /social    │ │ /profile   │ │ /admin     │ │ /ai        │                 │
│  │ feed       │ │ historial  │ │ stats      │ │ chatbot    │                 │
│  │ actividad  │ │ wishlist   │ │ métricas   │ │ recom. IA  │                 │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘                 │
│                                                                              │
│  Servicios internos del backend:                                             │
│                                                                              │
│  ┌──────────────────────────────┐ ┌───────────────────────────────────────┐  │
│  │ Auth Service                 │ │ Movies / Games Service                │  │
│  │ bcrypt · JWT                 │ │ Catálogo · Detalle · Reviews          │  │
│  │ recuperación contraseña      │ │ Watched/Played · Wishlist             │  │
│  └──────────────────────────────┘ └───────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────┐ ┌───────────────────────────────────────┐  │
│  │ Social / Profile Service     │ │ Admin Stats Service                   │  │
│  │ Amigos · Feed social         │ │ Usuarios · Contenido · Ratings        │  │
│  │ Historial · Wishlist         │ │ Visualizaciones · Top content         │  │
│  └──────────────────────────────┘ └───────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────┐ ┌───────────────────────────────────────┐  │
│  │ AI Recommendation Service    │ │ Jobs Service                          │  │
│  │ carga CSV · candidatos       │ │ node-cron                             │  │
│  │ prompt · Mistral API         │ │ refresco TMDb · recálculo stats       │  │
│  └──────────────────────────────┘ └───────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────┐ ┌───────────────────────────────────────┐  │
│  │ Email Service                │ │ Winston Logger                        │  │
│  │ Nodemailer                   │ │ logs estructurados                    │  │
│  │ recuperación de contraseña   │ │ info · warn · error                   │  │
│  └──────────────────────────────┘ └───────────────────────────────────────┘  │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        │ Mongoose ODM
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         BASE DE DATOS - MongoDB Atlas                        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ MongoDB Atlas                                                          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Colecciones principales:                                                    │
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │ User        │ │ Friendship  │ │ Movie       │ │ Game        │             │
│  │ usuarios    │ │ solicitudes │ │ películas   │ │ videojuegos │             │
│  │ roles       │ │ amistades   │ │ TMDb data   │ │ Steam data  │             │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘             │
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                             │
│  │ Review      │ │ Interaction │ │ Stats       │                             │
│  │ reseñas     │ │ watched     │ │ métricas    │                             │
│  │ respuestas  │ │ wishlist    │ │ cacheadas   │                             │
│  └─────────────┘ └─────────────┘ └─────────────┘                             │
└──────────────────────────────────────────────────────────────────────────────┘
### Servicio externos
┌──────────────────────────────────────────────────────────────────────────────┐
│                              SERVICIOS EXTERNOS                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐       ┌─────────────────────────────────────────────┐
│ TMDb API              │◄──────│ Backend - Movies Service / Jobs Service     │
│ Datos de películas    │       │ Cache-aside y refresco diario de películas  │
│ REST / JSON           │       └─────────────────────────────────────────────┘
└───────────────────────┘

┌───────────────────────┐       ┌─────────────────────────────────────────────┐
│ Steam Dataset         │◄──────│ Script ETL - steamETL.js                    │
│ Videojuegos           │       │ Importación inicial de videojuegos          │
│ CSV / JSON            │       └─────────────────────────────────────────────┘
└───────────────────────┘

┌───────────────────────┐       ┌─────────────────────────────────────────────┐
│ Supabase Storage      │◄──────│ Backend - AI Recommendation Service         │
│ movies.csv            │       │ Carga de catálogos para recomendaciones     │
│ games.csv             │       │ axios + csv-parser                          │
└───────────────────────┘       └─────────────────────────────────────────────┘

┌───────────────────────┐       ┌─────────────────────────────────────────────┐
│ Mistral API           │◄──────│ Backend - AI Recommendation Service         │
│ mistral-small-latest  │       │ Prompt + candidatos seleccionados           │
│ Recomendaciones IA    │       └─────────────────────────────────────────────┘
└───────────────────────┘

┌───────────────────────┐       ┌─────────────────────────────────────────────┐
│ SMTP ProtonMail       │◄──────│ Backend - Email Service                     │
│ Envío de correos      │       │ Recuperación de contraseña                  │
└───────────────────────┘       └─────────────────────────────────────────────┘

┌───────────────────────┐       ┌─────────────────────────────────────────────┐
│ YouTube               │◄──────│ Frontend                                    │
│ Trailers embebidos    │       │ iframe / embed                              │
└───────────────────────┘       └─────────────────────────────────────────────┘

### Documentación y pruebas
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DOCUMENTACIÓN Y TESTING                             │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│ Swagger / OpenAPI           │
│ /api-docs                   │
│ /api-docs.json              │
│ Documentación interactiva   │
│ de endpoints REST           │
└──────────────┬──────────────┘
               │
               │ documenta
               ▼
┌─────────────────────────────┐
│ Backend REST API            │
│ Express + rutas             │
└─────────────────────────────┘


┌─────────────────────────────┐
│ Tests interactivos          │
│ test/runner.js              │
│ auth · movies · games       │
│ reviews · interactions      │
│ profile · social · admin    │
└──────────────┬──────────────┘
               │
               │ peticiones HTTP
               ▼
┌─────────────────────────────┐
│ Backend REST API            │
└─────────────────────────────┘


┌─────────────────────────────┐
│ README                      │
│ instalación                 │
│ ejecución                   │
│ checks                      │
│ limitaciones                │
│ puntos de mejora            │
└─────────────────────────────┘

### Flujo principal de una petición
Usuario
  │
  │ Interactúa con la SPA
  ▼
Frontend Angular
  │
  │ Petición HTTP REST / JSON
  │ Authorization: Bearer JWT cuando procede
  ▼
Backend Express
  │
  ├─► Middleware CORS / JSON
  │
  ├─► Middleware JWT
  │      ├─ authRequired para rutas privadas
  │      └─ adminRequired para rutas de administración
  │
  ├─► Ruta correspondiente
  │      ├─ /auth
  │      ├─ /movies
  │      ├─ /games
  │      ├─ /friends
  │      ├─ /social
  │      ├─ /profile
  │      ├─ /admin
  │      └─ /ai
  │
  ├─► Servicio o lógica asociada
  │
  ├─► Acceso a MongoDB mediante Mongoose
  │
  ├─► Integración externa si es necesaria
  │      ├─ TMDb
  │      ├─ Mistral
  │      ├─ Supabase CSV
  │      └─ SMTP
  │
  ├─► Logging con Winston
  │
  ▼
Respuesta JSON al frontend

## Fuentes de datos abiertas utilizadas y su integración

## Módulos del back-end y descripción breve

## Enlaces al Swagger del API

## Enlaces al prototipado de la solución

## Tecnología utilizada en el front-end y módulos empleados

Angular 19 junto con TypeScript (~5.7) son la base del frontend: la aplicación está concebida como una SPA con componentes standalone y rutas lazy-loaded (véase `frontend/src/app/app.routes.ts`). Esta arquitectura facilita la carga perezosa de páginas y la escalabilidad del proyecto.

El enrutado y la navegación se gestionan con Angular Router; para el manejo de formularios se emplean tanto formularios template-driven (`ngModel`) como formularios reactivos cuando procede, aprovechando las utilidades de `@angular/forms` para validación y accesibilidad.

La comunicación con el backend se realiza mediante `HttpClient` y servicios especializados (p. ej. `frontend/src/app/core/services/auth.service.ts`, `frontend/src/app/core/services/profile.service.ts`). La colocación del token en las peticiones y el tratamiento centralizado de errores se implementan con el interceptor `frontend/src/app/core/interceptors/auth.interceptor.ts`.

La protección de rutas sensibles se realiza mediante guards (por ejemplo `frontend/src/app/core/guards/admin.guard.ts`) y la lógica de negocio está encapsulada en servicios reutilizables como `auth.service.ts`, `profile.service.ts`, `search.service.ts` y `social.service.ts`.

RxJS (~7.8) se utiliza para el manejo de streams y observables en servicios y peticiones asíncronas. Para las visualizaciones se usa Chart.js; la librería se integra directamente desde TypeScript (p. ej. importando `Chart` y `registerables` en `src/app/pages/profile/profile.component.ts`) y los gráficos se renderizan en elementos `<canvas>`.

La inicialización, actualización y destrucción de las instancias de `Chart` se gestionan desde los ciclos de vida de los componentes (`ngOnInit` / `ngOnDestroy`) para evitar fugas de memoria y permitir la actualización dinámica de datos (gráficos de barras, donuts, líneas, etc.). Bootstrap aporta utilidades CSS complementarias y Material Symbols se emplea para la iconografía (`material-symbols-outlined`).

El proyecto organiza los estilos en SCSS modular por página/componente, con variables y media queries para asegurar responsividad. Existen múltiples componentes reutilizables (sidebar, search-dropdown, topbar, chips, cards) y páginas principales como `home`, `login`, `profile`, `admin`, `ai-chat` y `reset-password`.

El estado local ligero se gestiona con `localStorage` (p. ej. token y nombre de usuario). Las variables de entorno y la URL de la API están centralizadas en `frontend/src/environments/environment.ts`.

Para testing y CI local, el proyecto incluye tooling para pruebas unitarias (Karma + Jasmine) y E2E (Cypress), declarado en `package.json`. El build y la CLI se apoyan en Angular CLI (`@angular/cli`) con scripts `start`, `build` y `test` en `package.json`.

## Modelo de IA utilizado y descripción de la integración

## Validación y pruebas realizadas (incl. E2E)

## Mejoras implementadas (opcional)

## Valoración global del proyecto
El proyecto cumple los objetivos planteados. Se ha desarrollado siguiendo las metodologías indicadas en clase y los resultados obtenidos responden a las expectativas del equipo. La solución es funcional, coherente con los requisitos y demostrable en su conjunto.

## Mejoras propuestas y limitaciones conocidas
### Limitaciones

- Se utiliza una base de datos en modalidad gratuita con límite de capacidad, lo que puede afectar la escalabilidad y el rendimiento.

- La integración con Gemini presentó problemas por las políticas de consulta y mensajes de error poco descriptivos; por ello se migró a Mistral como alternativa.
- Al añadir el nuevo campo de foto de perfil en la base de datos fue necesario implementar avatares de fallback para los usuarios sin imagen.

- No se definieron con suficiente claridad los roles dentro del equipo, especialmente las responsabilidades del perfil fullstack, ya que fueron al final tres personas en backend y una en frontend.

### Propuestas de mejora

- Unificar el idioma de las fuentes de datos de películas y juegos, o incorporar una opción de traducción en la aplicación para mejorar la experiencia del usuario.

- Evaluar opciones de base de datos con mayor capacidad (o planes de pago) para soportar crecimiento futuro.