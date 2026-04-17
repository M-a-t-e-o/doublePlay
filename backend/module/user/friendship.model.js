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