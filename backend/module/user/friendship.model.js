/**
 * module/user/friendship.model.js
 *
 * Modelo Mongoose para representar relaciones de amistad entre usuarios.
 *
 * Cada documento almacena el usuario emisor, el usuario receptor y el estado
 * de la solicitud de amistad. El modelo permite gestionar solicitudes pendientes
 * y amistades aceptadas.
 *
 * Incluye índices para evitar duplicados exactos y acelerar las consultas
 * de solicitudes recibidas.
 */
const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted'],
    default: 'pending'
  }
}, { timestamps: true });

// Prevents exact duplicate documents (same sender → same receiver) at DB level
friendshipSchema.index({ sender: 1, receiver: 1 }, { unique: true });

// Speeds up queries for pending received requests (GET /api/friends/requests/received)
friendshipSchema.index({ receiver: 1, status: 1 });

module.exports = mongoose.model('Friendship', friendshipSchema);