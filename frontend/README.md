# Frontend - doublePlay

Frontend de la aplicación doublePlay construido con **Angular 19**.

La aplicación consume la API del backend y ofrece navegación entre catálogo, detalle, autenticación y perfil, con una interfaz con tema dark mode y responsive.

## Objetivo

Este frontend se encarga de:

- Mostrar el catálogo de películas y juegos.
- Permitir ver el detalle de cada película o juego.
- Gestionar login, registro y sesión.
- Mostrar perfil de usuario con métricas y actividad.
- Ofrecer búsqueda rápida en varias pantallas.

## Estructura de carpetas

```text
frontend/
|-- src/
|   |-- app/
|   |   |-- app.component.*
|   |   |-- app.config.ts
|   |   |-- app.routes.ts
|   |   |-- core/
|   |   |   |-- components/
|   |   |   |   |-- sidebar/
|   |   |   |   `-- search-dropdown/
|   |   |   |-- interceptors/
|   |   |   `-- services/
|   |   `-- pages/
|   |       |-- home/
|   |       |-- login/
|   |       |-- register/
|   |       |-- movies/
|   |       |-- movie-detail/
|   |       |-- games/
|   |       |-- game-detail/
|   |       |-- profile/
|   |       `-- placeholder/
|   |-- main.ts
|   `-- styles.scss
|-- angular.json
|-- package.json
|-- tsconfig.json
|-- tsconfig.app.json
`-- README.md
```

### Qué hay en cada parte

- `core/components/`: componentes reutilizables.
	- `sidebar/`: navegación lateral de la app.
	- `search-dropdown/`: buscador global con resultados de películas y juegos.
- `core/services/`: servicios compartidos.
	- `auth.service.ts`: login, registro, token y sesión.
	- `search.service.ts`: búsqueda de contenido en backend.
- `core/interceptors/`: interceptores HTTP, por ejemplo el de autenticación.
- `pages/`: pantallas principales de la aplicación.

## Pantallas principales

- `home`: portada con banner destacado, recomendaciones y listados rápidos.
- `movies`: catálogo de películas con filtros, ordenación y paginación.
- `movie-detail`: detalle de película con trailer, interacción y reviews.
- `games`: catálogo de juegos con filtros, ordenación y paginación.
- `game-detail`: detalle de juego con información, interacción y reviews.
- `login`: inicio de sesión.
- `register`: registro de usuario.
- `profile`: perfil con estadísticas y bloques de actividad.
- `placeholder`: pantalla genérica para rutas todavía no implementadas.

## Funcionalidades destacadas

- Buscador reutilizable en Home, Movie Detail, Game Detail y Profile.
- Navegación directa a detalle de película o juego desde resultados de búsqueda.
- Catálogos con filtros por género, ordenación y paginación.
- Modales y acciones de detalle para interacción con contenido.

## Requisitos previos

- Node.js 18 o superior.
- npm 9 o superior.

## Instalación

1. Entrar en la carpeta del frontend:

```bash
cd frontend
```

2. Instalar dependencias:

```bash
npm install
```

## Comandos disponibles

### Lanzar en desarrollo

```bash
npm start
```

La app se abrirá en `http://localhost:4200/`.

### Compilar para producción

```bash
npm run build
```

## Stack principal

- `Angular 19`
- `TypeScript`
- `RxJS`
- `Bootstrap`
- `Chart.js`

## Notas de desarrollo

- El proyecto usa componentes standalone.
- Las rutas están definidas en `src/app/app.routes.ts`.
- El estilo global vive en `src/styles.scss`.
- El frontend depende del backend para cargar catálogos, detalles y búsquedas.

## Comprobación rápida

Si todo está correcto, al ejecutar `npm start` deberías poder:

- Ver la home.
- Buscar películas o juegos desde la barra superior.
- Entrar al detalle de un elemento desde el buscador o desde los listados.
- Abrir login, register y profile sin errores de rutas.
