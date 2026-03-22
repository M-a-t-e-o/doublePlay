# Backend - doublePlay

Backend de la aplicacion doublePlay construido con **Node.js + Express + MongoDB (Mongoose)**.

**SOLO LOCAL DE MOMENTO**

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
|-- routes/
|-- module/
|-- jobs/
|-- scripts/
|-- middleware/
`-- tests/
```

Descripcion de cada elemento:

- `index.js`: punto de entrada del servidor. Inicializa Express, configura middlewares globales, conecta a MongoDB y levanta la API en el puerto definido.
- `package.json`: define scripts (`start`,`test`, `dev`) y dependencias del backend.
- `routes/`: define endpoints agrupados por dominio/feature (usuarios, auth, partidos, etc.). Normalmente solo enruta peticiones y delega logica.
- `module/`: contiene la logica de negocio y/o modelos de datos (segun vuestra convencion del proyecto). Aqui suele residir la parte principal de cada funcionalidad.
- `jobs/`: 
- `scripts/`: 
- `middleware/`: funciones intermedias reutilizables para validaciones, control de acceso, manejo de errores, verificacion de token, etc.
- `tests/`: contiene los tests de los modulos y un runner para ejecutarlos de forma sencilla

Nota: aunque algunas carpetas puedan estar en evolucion segun la rama, esta es la organizacion funcional esperada del backend.

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior
- MongoDB accesible (local o Atlas)

## Comandos

1. Entrar al backend (siempre todo desde la carpeta):

```bash
cd backend
```

### Instalación:

2. Instalar dependencias:

```bash
npm install
```

3. Crear o completar el archivo `.env`

### Lanzar backend

```bash
npm start
```

### Lanzar backend (modo 'dev')

```bash
npm run dev
```

### Lanzar tests

2. Lanzar backend en terminal-1:

```bash
npm run dev
```

3. Lanzar tests en terminal-2:

```bash
npm run test
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
- `npm run test`: ejecuta el runner de tests.

## Stack del backend

- `express`: framework HTTP.
- `mongoose`: ODM para MongoDB.
- `dotenv`: carga variables de entorno.
- `cors`: habilita CORS.
- `jsonwebtoken`: autenticacion con JWT.
- `bcryptjs`: hash de contrasenas.
