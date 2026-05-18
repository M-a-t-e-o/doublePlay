# Backend - doublePlay

Backend de la aplicacion doublePlay construido con **Node.js + Express + MongoDB (Mongoose)**.

**SOLO LOCAL DE MOMENTO**

## Objetivo

Este servicio se encarga de:

- Exponer la API HTTP para el frontend.
- Gestionar autenticacion/autorizacion mediante JWT.
- Conectar con MongoDB para persistencia de datos.
- Aplicar middlewares comunes, como CORS y parseo JSON.
- Publicar la documentacion de la API mediante Swagger/OpenAPI.
- Ejecutar tareas programadas de refresco de datos y recalculo de estadisticas.
- Registrar eventos y errores del backend mediante Winston.

## Estructura de carpetas (explicada)

```text
backend/
|-- index.js
|-- package.json
|-- config/
|-- routes/
|-- module/
|-- jobs/
|-- scripts/
|-- middleware/
|-- utils/
`-- test/
```

Descripcion de cada elemento:

- `index.js`: punto de entrada del servidor. Inicializa Express, configura middlewares globales, conecta a MongoDB, registra las rutas, habilita Swagger y levanta la API en el puerto definido.
- `package.json`: define scripts (`start`, `test`, `dev`) y dependencias del backend.
- `config/`: contiene configuraciones generales del backend, como Swagger/OpenAPI.
- `routes/`: define endpoints agrupados por dominio funcional: autenticacion, peliculas, videojuegos, amistades, perfil, social, administracion e IA.
- `module/`: contiene los modelos Mongoose y servicios auxiliares de cada modulo funcional.
- `jobs/`: contiene tareas programadas, como refresco de peliculas y recalculo de estadisticas.
- `scripts/`: contiene scripts auxiliares de carga inicial, ETL y migracion de datos.
- `middleware/`: funciones intermedias reutilizables para autenticacion, autorizacion y control de acceso.
- `utils/`: utilidades comunes, como el servicio de correo y el logger centralizado.
- `test/`: contiene los tests interactivos de los modulos y un runner para ejecutarlos de forma sencilla.

## Requisitos previos

- Node.js 18 o superior.
- npm 9 o superior.
- MongoDB accesible, local o Atlas.
- Variables de entorno configuradas en `.env`.

## Comandos

1. Entrar al backend:

```bash
cd backend
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear o completar el archivo `.env`.

### Lanzar backend

```bash
npm start
```

### Lanzar backend en modo desarrollo

```bash
npm run dev
```

### Lanzar tests

1. Lanzar backend en una terminal:

```bash
npm run dev
```

2. Lanzar tests en otra terminal:

```bash
npm run test
```

Al arrancar correctamente deberian aparecer logs de Winston indicando, entre otros eventos, la conexion a MongoDB, el registro de jobs y el arranque del servidor.

## Comprobacion rapida

Con el servidor levantado, probar:

```text
GET http://localhost:3000/
```

Respuesta esperada:

```json
{
  "message": "API running"
}
```

## Documentacion Swagger

La documentacion de la API se publica desde el propio backend mediante Swagger UI.

```text
http://localhost:3000/api-docs
```

La especificacion OpenAPI en formato JSON esta disponible en:

```text
http://localhost:3000/api-docs.json
```

La API utiliza autenticacion mediante JWT. En Swagger se ha configurado el esquema `bearerAuth`, por lo que los endpoints protegidos pueden probarse introduciendo el token desde el boton **Authorize**.

## Scripts disponibles

- `npm start`: ejecuta el backend con Node.
- `npm run dev`: ejecuta el backend con Nodemon para desarrollo.
- `npm run test`: ejecuta el runner interactivo de tests.

## Justificación de dependencias del backend

| Paquete | Uso en el proyecto |
|---|---|
| `express` | Framework HTTP utilizado para construir la API REST del backend. |
| `mongoose` | ODM utilizado para definir modelos y acceder a MongoDB. |
| `dotenv` | Carga las variables de entorno desde el fichero `.env`. |
| `cors` | Permite configurar el acceso desde el frontend al backend evitando problemas de CORS. |
| `jsonwebtoken` | Generación y verificación de tokens JWT para autenticación. |
| `bcryptjs` | Hash y comparación segura de contraseñas de usuario. |
| `axios` | Realización de peticiones HTTP a fuentes externas como TMDb y CSV remotos. |
| `csv-parser` | Procesamiento de ficheros CSV utilizados por el módulo de recomendaciones. |
| `JSONStream` | Lectura en streaming del dataset de videojuegos en formato JSON. |
| `multer` | Gestión de subida de imágenes de perfil de usuario. |
| `node-cron` | Programación de tareas periódicas, como refresco de películas y recálculo de estadísticas. |
| `nodemailer` | Envío de correos de recuperación de contraseña. |
| `swagger-jsdoc` | Generación de documentación OpenAPI a partir de comentarios JSDoc en las rutas. |
| `swagger-ui-express` | Publicación de la interfaz web de Swagger en `/api-docs`. |
| `winston` | Sistema centralizado de logging estructurado del backend. |
| `@mistralai/mistralai` | Cliente utilizado para comunicarse con Mistral en el sistema de recomendaciones por IA. |
| `nodemon` | Dependencia de desarrollo para reiniciar automáticamente el servidor al modificar código. |

## Variables de entorno principales

El backend requiere configurar las variables necesarias en `.env`.

No se deben subir credenciales reales al repositorio.

## Checklist de verificacion del backend

Esta seccion recoge los checks revisados para la entrega de la parte backend, junto con su estado y justificacion.

### API

| Check | Estado | Justificacion |
|---|---|---|
| Se ha realizado la identificacion de los recursos que utiliza la aplicacion, y para cada uno se han implementado los metodos REST adecuados. | Cumple | La API esta dividida en recursos funcionales claros: `auth`, `movies`, `games`, `friends`, `social`, `profile`, `admin` e `ai`. Para ellos se utilizan metodos HTTP adecuados como `GET`, `POST`, `PATCH`, `PUT` y `DELETE`. |
| Se han anadido los metodos adicionales necesarios para el correcto funcionamiento de la aplicacion. | Cumple | Ademas del CRUD basico existen endpoints especificos para generos, visualizaciones, reviews, respuestas, interacciones, wishlist, feed social, estadisticas, recuperacion de contrasena y recomendaciones mediante IA. |
| Los metodos estan lo mas desacoplados posibles entre si, y con respecto a la capa de acceso a datos. | Cumple | El backend separa rutas, modelos Mongoose, middlewares, servicios, utilidades y jobs. Parte de la logica sigue en las rutas, pero se han extraido piezas comunes como autenticacion, estadisticas, reviews, TMDb, email y logging. |
| Se han definido schemas mediante Mongoose para los recursos que se utilizan en la aplicacion. | Cumple | Existen modelos Mongoose para usuarios, amistades, peliculas, videojuegos, interacciones, reviews y estadisticas. |
| Se han definido subschemas cuando se pueden utilizar, prefiriendolos sobre schemas independientes. | Cumple | Se usan estructuras embebidas para datos dependientes del documento principal, como `rating`, `profilePicture`, `platforms` y bloques agregados de estadisticas. |
| Se ha documentado el API por completo mediante Swagger. | Cumple | Los ficheros de rutas incluyen anotaciones Swagger/OpenAPI y la documentacion se publica en `/api-docs`. |
| Todos los endpoint devuelven codigos de respuesta HTTP adecuados segun su funcionamiento. | Cumple | Se usan codigos como `200`, `201`, `400`, `401`, `403`, `404`, `409`, `429` y `500` segun el resultado de cada operacion. |
| Se ha introducido un mecanismo de seguridad como JWT para securizar los endpoints. | Cumple | Los endpoints protegidos usan JWT mediante el middleware `authRequired`. Las rutas de administracion usan ademas `adminRequired`. |
| Se ha anadido la autenticacion a la documentacion del API. | Cumple | Swagger define el esquema `bearerAuth` y los endpoints protegidos lo declaran en su documentacion. |
| Se ha revisado el API frente a codigos de conducta en el diseno y desarrollo para buenas API. | Cumple | Las rutas son coherentes, usan recursos identificables, respuestas JSON consistentes, paginacion en listados y codigos HTTP apropiados. |

### Backend

| Check | Estado | Justificacion |
|---|---|---|
| El fichero `package.json` esta bien construido y documentado. | Cumple | Define scripts de arranque, desarrollo y test, dependencias necesarias, repositorio y metadatos del proyecto. Las dependencias principales estan justificadas en este README. |
| Se ha estructurado el codigo como lo visto en clase para el patron MVC y despues en modulos. | Cumple | El backend esta organizado por rutas, modelos, servicios, middlewares, jobs, scripts, utilidades y tests, manteniendo una estructura modular. |
| El codigo no da errores en su ejecucion. | Cumple | Se ha comprobado el arranque del backend, la conexion con MongoDB, la carga de rutas, Swagger, jobs y el funcionamiento de los endpoints revisados. |
| Se realiza logging mediante Winston. | Cumple | Se ha anadido `utils/logger.js` como logger centralizado y los ficheros principales usan Winston para registrar informacion, avisos y errores. |
| Todo el codigo esta correctamente documentado. | Cumple | Los ficheros principales incluyen cabecera identificativa y las funciones relevantes tienen comentarios explicativos. |
| Se ha documentado la justificacion y utilizacion de todos los paquetes identificados en el `package.json`. | Cumple | Este README incluye una tabla de dependencias principales y su uso dentro del backend. |
| Se han identificado y documentado las limitaciones de la aplicacion. | Cumple | Las limitaciones principales se documentan en la seccion de limitaciones. |
| Se han identificado y documentado los puntos de mejora de la aplicacion. | Cumple | Los puntos de mejora se documentan en la seccion de mejoras futuras. |

### Validacion y testing

| Check | Estado | Justificacion |
|---|---|---|
| Se realiza validacion de los datos introducidos desde el front-end tanto en el front como en back. | Cumple en backend | En backend se validan campos obligatorios, ids de MongoDB, ratings, booleanos, usernames, contrasenas, permisos, duplicados y tipos de fichero. La validacion de frontend corresponde a la parte cliente. |
| Se ha realizado el testing de front, back y API. | Cumple en backend/API | La parte backend incluye un runner de tests y suites interactivas para auth, admin, movies, games, interactions, reviews, profile, social y friends. |
| Se ha documentado cada uno de los testing realizados. | Cumple | Las pruebas realizadas quedan recogidas en la tabla de pruebas de este README y en los propios modulos de test. |
| Las pruebas se han realizado con exito. | Cumple | Los endpoints revisados funcionan correctamente y no se han detectado errores de ejecucion en las comprobaciones realizadas. |
| Si hay problemas con alguna prueba, el error se ha identificado y documentado. | Cumple | No quedan errores conocidos en las pruebas revisadas. En caso de fallo, los tests muestran estado HTTP y cuerpo de respuesta para identificar el problema. |
| Hay un testing E2E minimo. | Cumple | Se ha comprobado un flujo funcional completo de usuario: autenticacion, consulta de catalogo, interaccion con contenido, reviews y funcionalidades sociales. |

## Tabla de pruebas realizadas

| Modulo | Prueba | Endpoint principal | Resultado esperado | Estado |
|---|---|---|---|---|
| Auth | Registro correcto | `POST /api/auth/register` | `201` y usuario creado | OK |
| Auth | Login correcto | `POST /api/auth/login` | `200` y token JWT | OK |
| Auth | Politica de contrasena | `POST /api/auth/register` | `400` con contrasena debil | OK |
| Auth | Cambio de contrasena | `POST /api/auth/change-password` | `200` con token valido | OK |
| Auth | Recuperacion de contrasena | `POST /api/auth/forgot-password` y `POST /api/auth/reset-password` | Flujo de recuperacion correcto | OK |
| Movies | Catalogo paginado | `GET /api/movies?page=1&limit=5` | `200` con `data` y `pagination` | OK |
| Movies | Filtros y ordenacion | `GET /api/movies?search=&genre=&sort=` | `200` con resultados filtrados | OK |
| Movies | ID invalido | `GET /api/movies/id-que-no-existe` | `400` | OK |
| Games | Catalogo paginado | `GET /api/games?page=1&limit=5` | `200` con `data` y `pagination` | OK |
| Games | Filtros y ordenacion | `GET /api/games?search=&genre=&sort=` | `200` con resultados filtrados | OK |
| Games | ID invalido | `GET /api/games/id-que-no-existe` | `400` | OK |
| Reviews | Crear review | `POST /api/movies/:id/reviews` / `POST /api/games/:id/reviews` | `201` | OK |
| Reviews | Listar reviews | `GET /api/movies/:id/reviews` / `GET /api/games/:id/reviews` | `200` con reviews y respuestas | OK |
| Reviews | Editar review propia | `PATCH /api/movies/:id/reviews/:reviewId` | `200` | OK |
| Reviews | Eliminar review propia | `DELETE /api/movies/:id/reviews/:reviewId` | `200` | OK |
| Interactions | Estado de interaccion | `GET /api/movies/:id/interaction` | `200` con estado del usuario | OK |
| Interactions | Marcar visto/jugado | `PATCH /api/movies/:id/watched` / `PATCH /api/games/:id/watched` | `200` | OK |
| Interactions | Wishlist | `PATCH /api/movies/:id/wishlist` / `PATCH /api/games/:id/wishlist` | `200` | OK |
| Profile | Resumen de perfil | `GET /api/profile/me` | `200` con contadores y distribuciones | OK |
| Profile | Listados personales | `GET /api/profile/me/movies/watched`, `GET /api/profile/me/games/played`, etc. | `200` paginado | OK |
| Friends | Buscar usuarios | `GET /api/friends/search?query=` | `200` con usuarios encontrados | OK |
| Friends | Solicitudes de amistad | `POST`, `PUT` y `DELETE` sobre `/api/friends/...` | Flujo de amistad correcto | OK |
| Social | Feed social | `GET /api/social/feed` | `200` con eventos paginados | OK |
| Admin | Acceso admin | `GET /api/admin` | `200` con token admin | OK |
| Admin | Token usuario normal | `GET /api/admin` | `403` | OK |
| Admin | Estadisticas globales | `GET /api/admin/stats` | `200` con estadisticas | OK |
| AI | Generar recomendacion | `POST /api/ai/generate` | `200` con respuesta generada | OK |
| AI | Estado de catalogos | `GET /api/ai/status` | `200` con conteos y muestras | OK |

## Scripts de carga inicial y mantenimiento

### Peliculas

```bash
node scripts/seedMovies.js
```

Carga peliculas desde TMDb, obtiene detalles, transforma los datos al modelo interno y los inserta o actualiza en MongoDB.

### Videojuegos

```bash
node scripts/steamETL.js
```

Importa videojuegos desde el dataset local de Steam en streaming, filtrando registros incompletos o no adecuados.

### Migracion de usuarios

```bash
node scripts/migrate_users.js
```

Completa usuarios antiguos con campos nuevos como `username`, `role` e `isBanned`.

## Logging con Winston

El backend utiliza Winston mediante `utils/logger.js`. Este logger centraliza los registros de informacion, avisos y errores.

Ejemplo de log estructurado:

```json
{
  "level": "info",
  "message": "Server running on port 3000",
  "timestamp": "2026-05-16T12:00:00.000Z"
}
```

Winston se usa en los componentes principales del backend, como el arranque del servidor, jobs programados, administracion, IA, autenticacion y servicio de correo. Esto no modifica rutas, respuestas HTTP ni la integracion con el frontend.

## Limitaciones identificadas

- El backend depende de servicios externos como MongoDB, TMDb, Mistral, SMTP y los recursos remotos de catalogos.
- El modulo de IA depende de la disponibilidad y limites del proveedor externo.
- El dataset de videojuegos se importa mediante ETL desde fichero, no desde una API dinamica oficial.
- Los tests son funcionales/interactivos, no una bateria automatizada con aserciones tipo Jest/Supertest.
- Parte de la logica de negocio sigue residiendo en rutas Express, aunque se han separado servicios y utilidades principales.
- La documentacion Swagger debe mantenerse sincronizada manualmente cuando se modifiquen endpoints.
- La recuperacion de contrasena requiere configuracion SMTP valida.

## Puntos de mejora

- Anadir tests automatizados con Jest o Supertest.
- Anadir un flujo E2E automatico ejecutable en CI.
- Extraer mas logica de rutas a servicios/controladores especificos.
- Centralizar validaciones mediante AJV, Joi, Zod o middlewares de validacion.
- Anadir rate limiting en endpoints sensibles como login, recuperacion de contrasena e IA.
- Configurar CI/CD para ejecutar tests antes de desplegar.
- Mejorar la gestion de errores con un middleware global.
- Completar la documentacion de despliegue final cuando se cierre el entorno definitivo.
