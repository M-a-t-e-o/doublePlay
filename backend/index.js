/**
 * index.js
 *
 * Punto de entrada principal del backend de doublePlay.
 * Inicializa la aplicación Express, configura los middlewares globales,
 * establece la conexión con MongoDB, registra las rutas de la API,
 * habilita la documentación Swagger y arranca el servidor HTTP.
 *
 * También inicializa las tareas programadas de refresco de datos y
 * estadísticas una vez establecida la conexión con la base de datos.
 */
require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');

const { initRefreshJobs } = require('./jobs/refreshJobs');

const app = express();
const defaultAllowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://doubleplay-frontend.onrender.com'
];

const envAllowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];
const renderOriginRegex = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i;

app.use(cors({
  origin: (origin, callback) => {
    const isAllowedOrigin = !origin
      || allowedOrigins.includes(origin)
      || renderOriginRegex.test(origin);

    if (isAllowedOrigin) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('MongoDB connected');
    initRefreshJobs();
  })
  .catch(err => console.error('MongoDB error:', err));

app.get('/', (req, res) => {
  res.json({ message: 'API running' });
});

const authRoutes    = require('./routes/auth');
const aiRoutes      = require('./routes/ai');
const movieRoutes   = require('./routes/movies');
const gameRoutes    = require('./routes/games');
const friendRoutes  = require('./routes/friends');
const socialRoutes  = require('./routes/social');
const profileRoutes = require('./routes/profile');
const adminRoutes   = require('./routes/admin');

app.use('/api/auth',    authRoutes);
app.use('/api/ai',      aiRoutes);
app.use('/api/movies',  movieRoutes);
app.use('/api/games',   gameRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/social',  socialRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin',   adminRoutes);

// Swagger UI and raw spec
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});