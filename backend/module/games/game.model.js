const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({

  // ── Identificadores ──────────────────────────────────────────
  steamAppId: {
    type: String,
    required: true,
    unique: true    // evita duplicados si el ETL se ejecuta varias veces
  },

  // ── Datos que vienen del dataset de Steam ────────────────────
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    default: ''
  },
  genres: {
    type: [String], // ["Action", "RPG"] — vienen en inglés del dataset
    required: true,
    default: []
  },
  tags: {
    type: [String], // ["Open World", "Multiplayer", "Indie"...] — tags de la comunidad
    default: []     // más granulares que genres, clave para el chatbot RAG
  },
  releaseDate: {
    type: Date      // parseado desde texto libre ("Nov 2020", "2018-03-15"...)
  },
  coverUrl: {
    type: String    // URL completa del header_image de Steam, lista para <img>
  },
  price: {
    type: Number,   // en USD, 0 si es free to play
    default: 0
  },
  platforms: {
    windows: { type: Boolean, default: false },
    mac:     { type: Boolean, default: false },
    linux:   { type: Boolean, default: false }
  },
  developers: {
    type: [String],
    default: []
  },

  // ── Datos propios de doublePlay (no vienen de Steam) ─────────
  rating: {
    avg:   { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  numberReviews: {
    type: Number,
    default: 0
  },

  // ── Control de importación ───────────────────────────────────
  // Distinto a updatedAt de movies: aquí no hay refresco automático,
  // solo queremos saber de cuándo es el snapshot del dataset
  importedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: false
});

// Índices para las queries más frecuentes del catálogo
gameSchema.index({ genres: 1 });          // filtrar por género
gameSchema.index({ tags: 1 });            // filtrar por tag (chatbot RAG)
gameSchema.index({ 'rating.avg': -1 });   // ordenar por puntuación
gameSchema.index({ releaseDate: -1 });    // ordenar por fecha
gameSchema.index({ price: 1 });           // filtrar por precio

module.exports = mongoose.model('Game', gameSchema);