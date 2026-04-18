require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

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
    console.log('MongoDB connected');
    initRefreshJobs();
  })
  .catch(err => console.error('MongoDB error:', err));

app.get('/', (req, res) => {
  res.json({ message: 'API running' });
});

const authRoutes    = require('./routes/auth');
const movieRoutes   = require('./routes/movies');
const gameRoutes    = require('./routes/games');
const friendRoutes = require('./routes/friends');
const socialRoutes = require('./routes/social');

app.use('/api/auth',    authRoutes);
app.use('/api/movies',  movieRoutes);
app.use('/api/games',   gameRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/social',  socialRoutes);

// Swagger UI and raw spec
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));