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
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  ratedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

interactionSchema.index({ user: 1, contentType: 1, contentId: 1 }, { unique: true });
interactionSchema.index({ user: 1, inWishlist: 1, contentType: 1 });
interactionSchema.index({ user: 1, watched: 1, contentType: 1 });
interactionSchema.index({ contentType: 1, contentId: 1 });

module.exports = mongoose.model('Interaction', interactionSchema);
