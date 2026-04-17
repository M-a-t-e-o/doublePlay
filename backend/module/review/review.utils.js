const mongoose = require('mongoose');
const Review = require('./review.model');

/**
 * Serializa un documento de reseña para la respuesta JSON.
 * Se usa tanto en movies.js como en games.js.
 */
function mapReview(reviewDoc) {
  return {
    id:        reviewDoc._id,
    user:      reviewDoc.user,
    content:   reviewDoc.content,
    rating:    reviewDoc.rating,
    answerTo:  reviewDoc.answerTo,
    createdAt: reviewDoc.createdAt,
    updatedAt: reviewDoc.updatedAt
  };
}

/**
 * Recalcula el rating medio y los contadores de reseñas de una película o juego
 * y los persiste en el documento del contenido.
 *
 * @param {'movie'|'game'} contentType
 * @param {mongoose.Types.ObjectId|string} contentId
 * @param {mongoose.Model} ContentModel  - el modelo Movie o Game
 */
async function recalculateContentRating(contentType, contentId, ContentModel) {
  const targetId = new mongoose.Types.ObjectId(contentId);

  const stats = await Review.aggregate([
    {
      $match: {
        contentType,
        contentId: targetId,
        answerTo: null,
        rating: { $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        avg:   { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const avg   = stats[0] ? Number(stats[0].avg.toFixed(2)) : 0;
  const count = stats[0] ? stats[0].count : 0;

  const numberReviews = await Review.countDocuments({
    contentType,
    contentId: targetId,
    answerTo: null
  });

  await ContentModel.findByIdAndUpdate(contentId, {
    'rating.avg':   avg,
    'rating.count': count,
    numberReviews
  });
}

module.exports = { mapReview, recalculateContentRating };