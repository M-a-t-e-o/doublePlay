/**
 * module/interaction/interaction.model.js
 *
 * Modelo Mongoose para representar la interacción de un usuario con un contenido.
 *
 * Permite almacenar de forma unificada la relación entre usuarios y películas
 * o videojuegos, indicando si el contenido ha sido visto/jugado, cuándo ocurrió,
 * si está en la wishlist y cuándo fue añadido.
 *
 * Utiliza contentType y contentId para soportar distintos tipos de contenido
 * mediante un único modelo.
 */
const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentType: {
    type: String,
    enum: ['movie', 'game'],
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  watched: {
    type: Boolean,
    default: false
  },
  watchedAt: {
    type: Date,
    default: null
  },
  inWishlist: {
    type: Boolean,
    default: false
  },
  wishlistedAt: {
    type: Date,
    default: null
  },
}, { timestamps: true });

interactionSchema.index({ user: 1, contentType: 1, contentId: 1 }, { unique: true });
interactionSchema.index({ user: 1, inWishlist: 1, contentType: 1 });
interactionSchema.index({ user: 1, watched: 1, contentType: 1 });
interactionSchema.index({ contentType: 1, contentId: 1 });

module.exports = mongoose.model('Interaction', interactionSchema);
