# Backend - doublePlay

Backend de la aplicacion doublePlay construido con **Node.js + Express + MongoDB (Mongoose)**.

## Objetivo

Este servicio se encarga de:

- Exponer la API HTTP para el frontend.
- Gestionar autenticacion/autorizacion (JWT).
- Conectar con MongoDB para persistencia de datos.
- Aplicar middlewares comunes (CORS, parseo JSON, etc.).

## Estructura de carpetas (explicada)

```text
backend/
|-- index.js
|-- package.json
|-- .env
|-- routes/
|-- module/
`-- middleware/
```

Descripcion de cada elemento:

- `index.js`: punto de entrada del servidor. Inicializa Express, configura middlewares globales, conecta a MongoDB y levanta la API en el puerto definido.
- `package.json`: define scripts (`start`, `dev`) y dependencias del backend.
- `.env`: variables de entorno sensibles (por ejemplo, URI de MongoDB, puerto y secretos JWT).
- `routes/`: define endpoints agrupados por dominio/feature (usuarios, auth, partidos, etc.). Normalmente solo enruta peticiones y delega logica.
- `module/`: contiene la logica de negocio y/o modelos de datos (segun vuestra convencion del proyecto). Aqui suele residir la parte principal de cada funcionalidad.
- `middleware/`: funciones intermedias reutilizables para validaciones, control de acceso, manejo de errores, verificacion de token, etc.

Nota: aunque algunas carpetas puedan estar en evolucion segun la rama, esta es la organizacion funcional esperada del backend.

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior
- MongoDB accesible (local o Atlas)

## Configuracion local

1. Entrar al backend:

```bash
cd backend
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear o completar el archivo `.env`

## Como levantar el backend en local

### Modo desarrollo (autoreload)

```bash
npm run dev
```

### Modo produccion/local simple

```bash
npm start
```

Al arrancar correctamente deberias ver en consola mensajes como:

- `MongoDB connected`
- `Server running on port 3000`

## Comprobacion rapida

Con el servidor levantado, prueba:

- `GET http://localhost:3000/`

Respuesta esperada:

```json
{
	"message": "API running"
}
```

## Scripts disponibles

- `npm start`: ejecuta el backend con Node.
- `npm run dev`: ejecuta con Nodemon para desarrollo.

## Stack del backend

- `express`: framework HTTP.
- `mongoose`: ODM para MongoDB.
- `dotenv`: carga variables de entorno.
- `cors`: habilita CORS.
- `jsonwebtoken`: autenticacion con JWT.
- `bcryptjs`: hash de contrasenas.
