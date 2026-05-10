const mongoose = require('mongoose');

// Single-document collection — always one record with key 'platform'
const statsSchema = new mongoose.Schema({
  _id: { type: String, default: 'platform' },

  computedAt: { type: Date, default: null },

  users: {
    total: { type: Number, default: 0 },
    growthLast12Months: { type: Array, default: [] }
    // [{ key: '2025-01', month: 'Jan 2025', newUsers: 12, totalUsers: 120 }]
  },

  content: {
    totalMovies:       { type: Number, default: 0 },
    totalGames:        { type: Number, default: 0 },
    total:             { type: Number, default: 0 },
    moviesPercentage:  { type: Number, default: 0 },
    gamesPercentage:   { type: Number, default: 0 }
  },

  ratings: {
    platformAvg: { type: Number, default: 0 }
    // Weighted average across all rated movies and games
  },

  views: {
    total:  { type: Number, default: 0 },
    movies: { type: Number, default: 0 },
    games:  { type: Number, default: 0 }
  },

  genres: {
    movies: { type: Array, default: [] }, // [{ genre, count }]
    games:  { type: Array, default: [] }
  },

  topContent: { type: Array, default: [] }
  // [{ id, type, title, cover, avgRating, ratingCount }] — top 5
}, {
  _id: false,    // we manage _id manually as a string key
  timestamps: false
});

module.exports = mongoose.model('Stats', statsSchema, 'stats');