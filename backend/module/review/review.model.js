const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    contentType: {
        type: String,
        enum: ['game', 'movie'],
        required: true
    },
    contentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    answerTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
        default: null
    },
    content: {
        type: String,
        required: true,
        maxlength: 1000,
        trim: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
        validate: {
            validator: function(v) {
            // rating solo permitido en reseñas raíz
            return v === null || this.answerTo === null;
            },
            message: 'Las respuestas a reseñas no pueden tener rating'
        }
    }
}, { timestamps: true });

// Solo una reseña raíz por usuario para cada contenido
reviewSchema.index(
    { user: 1, contentType: 1, contentId: 1 },
    { unique: true, partialFilterExpression: { answerTo: null } }
);

reviewSchema.index({ contentType: 1, contentId: 1, answerTo: 1, createdAt: -1 });
reviewSchema.index({ answerTo: 1, createdAt: 1 });

module.exports = mongoose.model('Review', reviewSchema);