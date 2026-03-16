require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const { initRefreshJobs } = require('./jobs/refreshJobs');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    initRefreshJobs(); // Inicializar los jobs de refresco
  })
  .catch(err => console.log(err));

app.get('/', (req, res) => {
  res.json({ message: 'API running' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));