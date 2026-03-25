require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const { initRefreshJobs } = require('./jobs/refreshJobs');

const app = express();
const allowedOrigins = [
  'http://localhost:4200',
  'https://doubleplay-frontend.onrender.com'
];

app.use(cors({
  origin: (origin, callback) => {
    
    if (!origin || allowedOrigins.includes(origin)) {
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

const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const gameRoutes  = require('./routes/games');
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/games',  gameRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));