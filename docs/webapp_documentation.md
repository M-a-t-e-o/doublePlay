# DOCUMENTATION

## URLs de acceso al API (Swagger) y al Front-end
- URL del Frontend: https://doubleplay-frontend.onrender.com
- URL del Swagger: https://doubleplay.onrender.com/api-docs/

## Credenciales de acceso (usuario y administrador)
### Usuario administrador
- correo: paulina@gmail.com
- contraseña: Hola1234.

### Usuario normal
- correo: roberto@gmail.com
- contraseña: Hola1234.

## Diagrama de arquitectura de componentes
```text
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
```

### Servicio externos
```text
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
```

### Documentación y pruebas
```text
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
```


## Validación y pruebas realizadas (incl. E2E)

La validación funcional del frontend se ha documentado con pruebas end-to-end en Cypress. La configuración se encuentra en `cypress.config.ts` y los specs están en `cypress/e2e/auth`.

| Prueba | Archivo | Tipo | Qué valida |
|---|---|---|---|
| Login UI | `cypress/e2e/auth/login.cy.ts` | E2E visual | Render del formulario de acceso, visibilidad de contraseña y navegación a registro |
| Login con backend real | `cypress/e2e/auth/login_api.cy.ts` | E2E + API | Inicio de sesión correcto, almacenamiento del token en `localStorage` y manejo de credenciales inválidas |
| Registro UI | `cypress/e2e/auth/register.cy.ts` | E2E visual | Apertura/cierre del modal legal y navegación de vuelta a login |
| Registro con backend real | `cypress/e2e/auth/register_api.cy.ts` | E2E + API | Alta de usuario desde la interfaz y validación de errores por duplicidad de username |

Además de estas pruebas E2E, el proyecto mantiene tests unitarios y de integración del frontend y backend según la estructura del repositorio.


## Fuentes de datos abiertas utilizadas, URLs y explicación de su integración en la aplicación

La aplicación utiliza dos fuentes principales de datos abiertas para construir los catálogos de contenido: **The Movie Database (TMDb)** para películas y **Steam Games Dataset** para videojuegos. Ambas fuentes se integran desde el backend, pero mediante estrategias distintas: en el caso de las películas se utiliza una **API REST**, mientras que en el caso de los videojuegos se realiza un proceso **ETL** a partir de un fichero estático.

---

### 1. Películas - The Movie Database (TMDb)

**URL principal:** https://www.themoviedb.org  
**API utilizada:** https://api.themoviedb.org/3  
**Documentación:** https://developer.themoviedb.org/docs/getting-started

**The Movie Database (TMDb)** es una base de datos online de contenido audiovisual que ofrece una API REST para desarrolladores. En doublePlay se utiliza como fuente principal para obtener información de películas, incluyendo título, título original, descripción, fecha de estreno, duración, idioma original, géneros, imágenes de póster y fondo, valoración externa y trailers.

La integración se realiza desde el backend mediante peticiones HTTP con `axios`. La clave de acceso a la API se configura mediante una variable de entorno en el fichero `.env`, evitando incluir credenciales directamente en el código fuente. El endpoint base utilizado es:

```js
const TMDB_BASE = 'https://api.themoviedb.org/3';
```

#### Extracción inicial de datos

La carga inicial de películas se realiza mediante el script:

```bash
node scripts/seedMovies.js
```

Este script se ejecuta manualmente durante la preparación inicial de la base de datos. Su objetivo es poblar MongoDB con un conjunto amplio de películas obtenidas desde TMDb.

El proceso de extracción consulta varios endpoints de TMDb, entre ellos:

- películas populares;
- películas mejor valoradas;
- películas filtradas por géneros principales.

A partir de esos listados se recogen los identificadores de TMDb de cada película. Después, para cada identificador se solicita el detalle completo de la película mediante el endpoint de detalle:

```text
/movie/{tmdbId}
```

Además, se utiliza el parámetro `append_to_response=videos` para obtener en la misma petición los vídeos asociados a la película, lo que permite localizar trailers disponibles en YouTube.

#### Transformación y limpieza

La respuesta de TMDb llega en formato JSON. Antes de guardarla en la base de datos, el backend transforma esa respuesta al formato interno definido en el modelo `Movie` de Mongoose.

Durante esta transformación se realizan varias adaptaciones:

- El identificador externo de TMDb se guarda como `tmdbId`.
- Los géneros, que llegan como objetos con `id` y `name`, se transforman en un array simple de nombres.
- Las fechas de estreno se convierten a tipo `Date`.
- Las rutas relativas de imágenes (`poster_path` y `backdrop_path`) se convierten en URLs completas de imagen.
- Se selecciona el primer vídeo de tipo `Trailer` cuyo proveedor sea `YouTube`, guardando su identificador como `trailerYoutubeId`.
- Se almacenan datos externos como la valoración media de TMDb.
- Se añaden campos propios de doublePlay, como la valoración interna, el número de reseñas y la fecha de actualización del documento.

De forma simplificada, el flujo de transformación es:

```text
JSON de TMDb
    ↓
Selección de campos útiles
    ↓
Normalización de géneros, fechas e imágenes
    ↓
Selección de trailer de YouTube
    ↓
Adaptación al schema Movie de Mongoose
```

#### Guardado en MongoDB

Los datos transformados se almacenan en **MongoDB Atlas** mediante Mongoose. Para evitar duplicados, se utiliza el campo `tmdbId` como identificador externo de referencia. La inserción se realiza mediante operaciones de actualización/inserción (`upsert`), de forma que:

- si la película no existe, se crea un nuevo documento;
- si la película ya existe, se actualiza con los datos más recientes.

El resultado es un catálogo local de películas almacenado en MongoDB que puede ser consultado por el frontend a través de los endpoints REST de `/api/movies`.

#### Refresco y caché de datos

Además de la carga inicial, el backend incluye un servicio específico para la integración con TMDb:

```text
module/movies/tmdbService.js
```

Este servicio centraliza la lógica de consulta, transformación y actualización de películas. Su uso permite aplicar una estrategia de caché local: la aplicación consulta primero MongoDB y solo acude a TMDb cuando el contenido no existe o se considera desactualizado.

También existe un job programado con `node-cron` que refresca periódicamente las películas obsoletas. De este modo, la aplicación reduce el número de llamadas a la API externa y evita depender de TMDb en cada petición del usuario.

El flujo general es:

```text
Usuario solicita una película
        ↓
Backend consulta MongoDB
        ↓
¿Existe y está actualizada?
        ├── Sí → devuelve el dato almacenado
        └── No → consulta TMDb con axios
                    ↓
              transforma el JSON
                    ↓
              actualiza MongoDB
                    ↓
              devuelve la respuesta
```

---

### 2. Videojuegos - Steam Games Dataset

**URL:** https://www.kaggle.com/datasets/fronkongames/steam-games-dataset

Para el catálogo de videojuegos se utiliza el dataset abierto **Steam Games Dataset**, disponible en Kaggle. Este conjunto de datos contiene información de juegos publicados en Steam y se utiliza para poblar el catálogo de videojuegos de doublePlay.

A diferencia de TMDb, esta fuente no se consume mediante una API REST en tiempo real. En su lugar, se trabaja con un fichero estático `games.json`, por lo que la integración se realiza mediante un proceso **ETL**: extracción, transformación y carga.

#### Extracción del dataset

La extracción se realiza con el script:

```bash
node scripts/steamETL.js
```

Este script lee el fichero:

```text
backend/data/games.json
```

Debido al tamaño del dataset, el fichero no se carga completo en memoria. En su lugar, se procesa en streaming utilizando `fs.createReadStream` y `JSONStream`. Esta decisión permite tratar un volumen elevado de registros de forma eficiente y evita problemas de memoria durante la importación.

El flujo de extracción es:

```text
games.json
    ↓
lectura en streaming
    ↓
emisión de registros individuales
    ↓
procesamiento por lotes
```

#### Transformación y limpieza

Durante la fase de transformación, cada registro del dataset se adapta al modelo interno `Game` de Mongoose. El backend extrae y normaliza campos como:

- `steamAppId`, utilizado como identificador externo del juego;
- `title`, obtenido a partir del nombre del juego;
- `description`, usando la descripción corta disponible;
- `genres`, con los géneros asociados al juego;
- `tags`, obtenidos a partir de las etiquetas de comunidad;
- `releaseDate`, transformada a tipo `Date` cuando es posible;
- `coverUrl`, usando la imagen principal del juego;
- `price`, con el precio disponible en el dataset;
- `platforms`, indicando compatibilidad con Windows, macOS y Linux;
- `developers`, con la lista de desarrolladores;
- `importedAt`, para registrar la fecha de importación.

Además, se aplican filtros de limpieza para evitar importar registros incompletos o no adecuados para la aplicación. En concreto, se descartan juegos que cumplan alguna de estas condiciones:

- no tienen nombre;
- no tienen descripción;
- no tienen géneros;
- tienen un número muy bajo de valoraciones positivas;
- contienen géneros o etiquetas asociadas a contenido sexual explícito, NSFW o no adecuado para el catálogo de la aplicación.

Esta fase permite reducir el dataset original y conservar únicamente aquellos juegos que aportan valor al catálogo de doublePlay.

#### Guardado en MongoDB

Una vez transformados y filtrados, los videojuegos válidos se almacenan en **MongoDB Atlas** mediante Mongoose.

Para mejorar el rendimiento, el script no inserta los documentos uno a uno. En su lugar, acumula operaciones y las ejecuta por lotes mediante `bulkWrite`. Cada operación utiliza el identificador `steamAppId` como referencia, permitiendo insertar juegos nuevos o actualizar juegos existentes sin generar duplicados.

El flujo de carga es:

```text
Registro válido
    ↓
Transformación al schema Game
    ↓
Creación de operación updateOne con upsert
    ↓
Acumulación en lote
    ↓
bulkWrite en MongoDB
```

En una ejecución documentada del proceso ETL se procesaron más de **122.000 registros**, de los cuales se importaron aproximadamente **20.000 videojuegos** y se descartaron el resto por no cumplir los criterios de calidad definidos.

El resultado final es un catálogo local de videojuegos almacenado en MongoDB, consultable desde el backend mediante los endpoints REST de `/api/games`.

---

### Resumen de integración

| Fuente | URL | Tipo de integración | Destino |
|---|---|---|---|
| TMDb | https://www.themoviedb.org | API REST con `axios`, transformación JSON y caché local | Colección `Movie` en MongoDB |
| Steam Games Dataset | https://www.kaggle.com/datasets/fronkongames/steam-games-dataset | ETL desde `games.json` con streaming, filtros y `bulkWrite` | Colección `Game` en MongoDB |


## Módulos del back-end y descripción breve

El backend de doublePlay está estructurado modularmente en `backend/module/`, con cada módulo encapsulando la lógica de negocio asociada a una entidad principal:

### Módulos principales

#### 1. **User** (`backend/module/user/`)
- **user.model.js**: Modelo de datos de usuarios, incluyendo autenticación, roles y perfil.
- **friendship.model.js**: Modelo para gestionar relaciones de amistad entre usuarios.
- **Se encarga de:**: Registro, login, recuperación de contraseña, gestión de perfil y amistades.

#### 2. **Movies** (`backend/module/movies/`)
- **movie.model.js**: Modelo para películas con información de catálogo, reseñas y wishlist.
- **tmdbService.js**: Servicio de integración con TMDb API para importación, actualización y caché de películas.
- **Se encarga de:**: Catálogo de películas, detalles, búsqueda, reseñas de películas, wishlist y consulta a TMDb.

#### 3. **Games** (`backend/module/games/`)
- **game.model.js**: Modelo para videojuegos importados desde el Steam Games Dataset.
- **Se encarga de:**: Catálogo de videojuegos, detalles, búsqueda, reseñas de juegos y wishlist.

#### 4. **Review** (`backend/module/review/`)
- **review.model.js**: Modelo para reseñas y respuestas de usuarios.
- **review.utils.js**: Utilidades para cálculo de puntuaciones y estadísticas de reseñas.
- **Se encarga de:**: Creación, edición, eliminación y gestión de reseñas en películas y juegos.

#### 5. **Interaction** (`backend/module/interaction/`)
- **interaction.model.js**: Modelo para rastrear interacciones del usuario (visualizaciones, wishlist, etc.).
- **Se encarga de:**: Registro de qué películas/juegos ha visto o añadido a favoritos cada usuario.

#### 6. **Stats** (`backend/module/stats/`)
- **stats.model.js**: Modelo para estadísticas agregadas del sistema.
- **stats.service.js**: Servicio para cálculo de métricas, rankings y visualizaciones.
- **Se encarga de:**: Generación de estadísticas globales, rankings de contenido, métricas de usuarios y panel administrativo.

### Componentes complementarios

#### **Rutas API** (`backend/routes/`)
Define los endpoints REST organizados por dominios:
- `auth.js`: Login, registro, recuperación de contraseña.
- `users.js`: Gestión de perfil y datos de usuario.
- `movies.js`: Operaciones sobre películas (búsqueda, reseñas, wishlist).
- `games.js`: Operaciones sobre videojuegos (búsqueda, reseñas, wishlist).
- `friends.js`: Solicitudes de amistad y gestión de amigos.
- `social.js`: Feed social y actividad de amigos.
- `profile.js`: Historial y estadísticas de usuario.
- `admin.js`: Panel administrativo y métricas globales.
- `ai.js`: Endpoint de recomendaciones con IA.

#### **Middleware** (`backend/middleware/`)
- `auth.js`: Validación de JWT y roles (authRequired, adminRequired).

#### **Configuración** (`backend/config/`)
- `swagger.js`: Configuración de la documentación OpenAPI/Swagger.

#### **Jobs programados** (`backend/jobs/`)
- `refreshJobs.js`: Tareas recurrentes con `node-cron` para refrescar películas y recalcular estadísticas.

#### **Utilidades** (`backend/utils/`)
- `emailService.js`: Envío de correos electrónicos (recuperación de contraseña) con Nodemailer.
- `logger.js`: Logging estructurado con Winston (info, warn, error).

#### **Scripts de inicialización** (`backend/scripts/`)
- `seedMovies.js`: Carga inicial de películas desde TMDb.
- `steamETL.js`: Proceso ETL para importar videojuegos desde el Steam Games Dataset.
- `migrate_users.js`: Migración de datos de usuario si es necesaria.

#### **Testing** (`backend/test/`)
Pruebas interactivas de endpoints organizadas por módulo (auth, movies, games, profile, reviews, interactions, social, admin).

### Flujo de integración

```text
Petición HTTP → Ruta API → Middleware Auth → Servicio/Modelo → MongoDB ↔ Servicios Externos
```

## Enlaces al Swagger del API
- URL del Swagger: https://doubleplay.onrender.com/api-docs/

## Enlaces al prototipado de la solución

- Enlace al Figma con el prototipo de la aplicación: https://www.figma.com/make/BCAYfdpLzSF11Z71Xv6YTv/doublePlay-Wireframe-Design?code-node-id=0-9&p=f&t=7ArCTxqYy1oyNYq9-0&fullscreen=1

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

### Módulos del front-end y descripción breve

El front-end de doublePlay está organizado en `frontend/src/app/` siguiendo una arquitectura por capas: componentes de UI, páginas (views), servicios compartidos y utilidades de aplicación. A continuación se describen los módulos principales y su responsabilidad.

#### Módulos principales

##### 1. **Core** (`frontend/src/app/core/`)
- **`services/`**: contiene servicios que encapsulan la lógica de negocio y las llamadas al API (`auth.service.ts`, `profile.service.ts`, `search.service.ts`, `social.service.ts`, etc.).
- **`interceptors/`**: `auth.interceptor.ts` inserta el token JWT en las peticiones y centraliza el manejo de errores.
- **`guards/`**: `admin.guard.ts` y otros guards protegen rutas y controlan accesos.
- **Se encarga de:** autenticación, autorización, comunicación con el backend y utilidades compartidas.

##### 2. **Pages** (`frontend/src/app/pages/`)
- Contiene las vistas principales organizadas por dominio: `home`, `movies`, `games`, `profile`, `admin`, `ai-chat`, `login`, `register`, `reset-password`, `movie-detail`, `game-detail`, `social`, etc.
- Cada página agrupa componentes, servicios locales y estilos asociados, y suele cargarse de forma lazy-loaded desde `app.routes.ts`.
- **Se encarga de:** UX principal, enrutamiento y presentación de datos.

##### 3. **Shared / Components** (`frontend/src/app/core/components/`)
- Componentes reutilizables como `sidebar/`, `search-dropdown/`, `topbar/`, `chips/`, `cards/` que son consumidos por las páginas y layouts.
- **Se encarga de:** construir la interfaz reutilizable y consistente entre vistas.

##### 4. **Visualización y utilidades**
- Integración con `Chart.js` en componentes de perfil y admin para gráficos dinámicos (`profile.component.ts`, vistas de estadísticas).
- Gestión de estado ligero con `localStorage` (token, username) y flujos reactivos con RxJS.

##### 5. **Configuración y entornos**
- `frontend/src/environments/environment.ts` y `environment.prod.ts` centralizan la URL de la API y otras variables de configuración.

##### 6. **Testing y e2e**
- Unit tests con Karma + Jasmine y pruebas E2E con Cypress (`frontend/cypress/e2e/`), incluyendo helpers en `cypress/support/`.

##### 7. **Build y tooling**
- Angular CLI gestionado desde `angular.json` y scripts en `package.json` (`start`, `build`, `test`, `cypress`).

#### Flujo de integración (front-end)

Petición del usuario → Componente/Página → Servicio `HttpClient` → Backend API → Respuesta → Actualización de vista y estado local

Este apartado complementa la descripción de módulos del backend y refleja la estructura real del código en `frontend/src/app/`.

## Modelo de IA utilizado y descripción de la integración
La integración con IA utiliza Mistral AI como sistema de recomendación cruzada entre películas y videojuegos. Esto es, a partir de una película o un videojuego que el usuario especifica haber visto o jugado, recomienda un item del tipo contrario para ver/jugar que la IA entiende que disfutará por parecerse al que el usuario ya ha visto/jugado.

El proceso comienza con un motor de búsqueda local que actúa como un filtro de alta eficiencia para no saturar a la inteligencia artificial. Cuando envías una consulta, el sistema limpia tu texto (quita acentos, minúsculas) y lo fragmenta en palabras clave. Luego, analiza cada película y videojuego de la base de datos mediante un sistema de puntuación (scoreItem): si tus palabras coinciden con los géneros o etiquetas del ítem, este suma muchos puntos; si coinciden con el título o la descripción, suma menos. Tras evaluar todo el catálogo, el algoritmo ordena los resultados y extrae únicamente un "top" de finalistas: las 4 mejores películas y los 6 mejores videojuegos.

Una vez seleccionados estos 10 finalistas, el sistema le entrega el control a Mistral AI para redactar la recomendación final. La IA recibe tu mensaje original acompañado exclusivamente por la lista de esos candidatos seleccionados y un mapa de instrucciones muy estrictas. El modelo de lenguaje evalúa cuál de las opciones pre-filtradas encaja mejor con las sutilezas de tu petición (como el tono o la temática) y redacta una respuesta humana y directa de una o dos frases. Gracias a las reglas del sistema, la IA tiene prohibido inventar títulos o cambiar de medio: si pediste un videojuego basado en una película, usará la película como referencia, pero elegirá obligatoriamente uno de los 6 videojuegos candidatos del catálogo real.

En un principio se propuso usar Gemini pero por las limitaciones de la API que este daba, ha resultado más fácil utilizar Mistral.

## Despliegue y startup

El proyecto se despliega en **Render** separando backend y frontend:

### Backend
- Se publica como **Web Service**.
- El arranque en producción usa el script `start` del `backend/package.json`, que ejecuta `node index.js`.
- El servidor Express escucha en el puerto indicado y, si no existe, usa el puerto `3000`.
- La conexión a MongoDB se inicializa con la Mongo Uri indicada.

### Frontend
- Se publica como **Static Site**.
- El build de producción usa `npm run build`, que genera la salida en `frontend/dist/frontend`.
- En producción Angular sustituye `src/environments/environment.ts` por `src/environments/environment.prod.ts`, donde queda definida la URL del backend en Render.

### Carga de variables de entorno en Render

En local, el backend carga las variables desde el archivo `.env` con `require('dotenv').config()` al iniciar `backend/index.js`. En Render no se sube el archivo `.env`; en su lugar, las mismas claves se crean en el panel del servicio, en la sección **Environment Variables**. Render las expone como variables de proceso (por lo tanto, `dotenv` no haría falta en producción para leerlas.)

## Validación y pruebas realizadas (incl. E2E)

## Mejoras implementadas (opcional)

### 1. Analizadores estáticos de código

Se integra **SonarQube** para análisis automático de calidad del código, detectando vulnerabilidades, code smells y duplicaciones en backend y frontend.

- SonarQube se instaló en el repositorio y realizó un análisis completo.
- Se corrigieron los fallos más sencillos y aparentes.
- No se eliminaron todos los issues debido al coste de tiempo que eso conllevaría.

### 2. Sistema de recuperación de contraseña por correo

Implementado con **Nodemailer** y **Gmail SMTP** (se consideró **ProtonMail**, pero solo ofrece SMTP en suscripción de pago).

**Flujo:**
- Usuario solicita reset de contraseña.
- Recibe enlace temporal con token JWT válido por 1 hora.
- Token permite establecer nueva contraseña.

**Integración:**
- Servicio centralizado en `backend/utils/emailService.js`
- Endpoints: `/auth/forgot-password`, `/auth/reset-password`

**Limitación:** Esta funcionalidad está disponible únicamente en despliegues locales, ya que **Render** bloquea puertos SMTP en sus despliegues gratuitos. Esto no es ideal, pero es la única solución disponible por el momento.

### 3. Herramientas para la exportación de los registros del sistema
Se han implementado utilidades para exportar las estadísticas del panel de administración en formatos **CSV**, **JSON** y **HTML**.

Permite al administrador descargar reportes de métricas (usuarios, visualizaciones, contenido top, valoraciones, etc.) directamente desde el panel de administración.

Los **formatos** disponibles son `CSV` (para análisis en hojas de cálculo), `JSON` (estructura completa para consumo programático) y `HTML` (reporte formateado listo para visualización o impresión).
- Integración back-end: endpoint protegido `GET /admin/stats/` que devuelve el fichero solicitado.
- Integración front-end: botón de "Exportar" en la vista de estadísticas que abre un selector de formato y lanza la descarga del fichero.

**Seguridad y rendimiento**: la descarga requiere token JWT de administrador; las exportaciones se generan en memoria o mediante streaming para evitar consumo excesivo de memoria y no dejan archivos temporales en el servidor.

**Limitaciones conocidas**: para conjuntos de datos muy grandes la exportación puede tardar y estar sujeta a límites del hosting; se recomendó el uso de streaming en esos casos.

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
