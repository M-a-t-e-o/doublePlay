const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: ['game', 'movie'],
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
        // Max length for the review
        maxlength: 500
    },
    rating: {
        type: Number,
        min: 0,
        max: 5
    }
})

module.exports = mongoose.model('Review', reviewSchema);