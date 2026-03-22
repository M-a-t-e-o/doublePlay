const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({

  // ── Identificadores ──────────────────────────────────────────
  tmdbId: {
    type: Number,
    required: true,
    unique: true   // evita duplicados si el seed se ejecuta dos veces
  },

  // ── Datos que vienen de TMDb ──────────────────────────────────
  title: {
    type: String,
    required: true
  },
  originalTitle: {
    type: String
  },
  description: {
    type: String,
    default: ''
  },
  releaseDate: {
    type: Date
  },
  posterUrl: {
    type: String    // URL completa ya construida, lista para el <img>
  },
  //backdropUrl: {
  //  type: String    // imagen de fondo para el banner del detalle
  //},
  trailerYoutubeId: {
    type: String    // solo el ID (ej: "dQw4w9WgXcQ"), no la URL entera
  },
  genres: {
    type: [String], // ["Acción", "Drama", "Ciencia ficción"]
    default: []     // clave para los filtros del catálogo y el chatbot RAG
  },
  language: {
    type: String    // "es", "en", "fr"... código ISO
  },
  runtime: {
    type: Number    // duración en minutos
  },
  isAdult: {
    type: Boolean,
    default: false
  },

  // puntuación externa de TMDb (0-10), distinta de la vuestra
  //externalRating: {
  //  type: Number,
  //  default: 0
  //},

  // ── Datos propios de doublePlay (no vienen de TMDb) ───────────
  rating: {
    avg:   { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  views: {
    type: Number,
    default: 0
  },

  // ── Control de caché ─────────────────────────────────────────
  // Este campo es la clave del refresco automático.
  // Sin él no puedes saber si el dato está caducado.
  updatedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: false  // manejamos updatedAt manualmente para el cache-aside
});

// Índices para acelerar las queries más frecuentes del catálogo
movieSchema.index({ genres: 1 });                     // filtrar por género
movieSchema.index({ 'rating.avg': -1 });            // ordenar por puntuación
movieSchema.index({ releaseDate: -1 });               // ordenar por fecha
movieSchema.index({ updatedAt: 1 });                  // el cron busca los más antiguos

module.exports = mongoose.model('Movie', movieSchema);