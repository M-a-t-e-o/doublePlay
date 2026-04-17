const router = require('express').Router();
const Game   = require('../module/games/game.model');
const Interaction = require('../module/interaction/interaction.model');
const Review = require('../module/review/review.model');
const { mapReview, recalculateContentRating } = require('../module/review/review.utils');
const { authRequired } = require('../middleware/auth');
const mongoose = require('mongoose');

// ── Mapa de opciones de ordenación ───────────────────────────
const SORT_OPTIONS = {
  'rating_desc':  { 'rating.avg': -1 },
  'rating_asc':   { 'rating.avg':  1 },
  'date_desc':    { releaseDate:  -1 },
  'date_asc':     { releaseDate:   1 },
  'title_asc':    { title:         1 },
  'reviews_desc': { numberReviews:-1 }
};

// ── GET /api/games ────────────────────────────────────────────
// Query params:
//   page    → número de página (default: 1)
//   limit   → resultados por página (default: 20)
//   search  → buscar por título (ej: ?search=witcher)
//   genre   → filtrar por género (ej: ?genre=Action)
//   sort    → ordenación (ej: ?sort=date_desc)
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const sort = SORT_OPTIONS[req.query.sort] || SORT_OPTIONS['rating_desc'];

    const filter = {};

    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    if (req.query.genre) {
      filter.genres = { $in: [req.query.genre] };
    }

    const [games, total] = await Promise.all([
      Game.find(filter).sort(sort).skip(skip).limit(limit),
      Game.countDocuments(filter)
    ]);

    res.json({
      data:       games,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext:    page < Math.ceil(total / limit),
        hasPrev:    page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/games/genres/list ────────────────────────────────
// Devuelve todos los géneros distintos de juegos
router.get('/genres/list', async (req, res) => {
  try {
    const genres = await Game.distinct('genres');
    res.json(genres.sort());
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/games/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    res.json(game);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid game id' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/games/:id/views ─────────────────────────────────
// Devuelve solo el número de usuarios que marcaron el juego como visto
router.get('/:id/views', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    const game = await Game.findById(req.params.id).select('_id');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const viewsCount = await Interaction.countDocuments({
      contentType: 'game',
      contentId: game._id,
      watched: true
    });

    return res.json({
      contentType: 'game',
      contentId: game._id,
      viewsCount
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/games/:id/reviews ───────────────────────────────
// Lista reseñas raíz con sus respuestas en un único payload
router.get('/:id/reviews', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    const game = await Game.findById(req.params.id).select('_id');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const roots = await Review.find({
      contentType: 'game',
      contentId: game._id,
      answerTo: null
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    const rootIds = roots.map(r => r._id);
    const replies = rootIds.length
      ? await Review.find({ answerTo: { $in: rootIds } })
          .populate('user', 'name')
          .sort({ createdAt: 1 })
      : [];

    const repliesByRoot = new Map();
    for (const reply of replies) {
      const key = String(reply.answerTo);
      if (!repliesByRoot.has(key)) {
        repliesByRoot.set(key, []);
      }
      repliesByRoot.get(key).push(mapReview(reply));
    }

    const data = roots.map(root => ({
      ...mapReview(root),
      replies: repliesByRoot.get(String(root._id)) || []
    }));

    return res.json({ data, total: data.length });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/games/:id/reviews ──────────────────────────────
// Crea la reseña raíz del usuario (1 por usuario y juego)
router.post('/:id/reviews', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    const { rating, content } = req.body;
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    const isValidRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;

    if (!isValidRating) {
      return res.status(400).json({ message: 'rating must be an integer between 1 and 5' });
    }

    if (!trimmedContent) {
      return res.status(400).json({ message: 'content is required' });
    }

    const game = await Game.findById(req.params.id).select('_id');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const existingRoot = await Review.findOne({
      user: req.userId,
      contentType: 'game',
      contentId: game._id,
      answerTo: null
    }).select('_id');

    if (existingRoot) {
      return res.status(409).json({ message: 'Root review already exists for this user and game' });
    }

    const review = await Review.create({
      user: req.userId,
      contentType: 'game',
      contentId: game._id,
      answerTo: null,
      content: trimmedContent,
      rating
    });

    await recalculateContentRating('game', game._id, Game);

    const populated = await Review.findById(review._id).populate('user', 'name');
    return res.status(201).json(mapReview(populated));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Root review already exists for this user and game' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/games/:id/reviews/:reviewId/replies ────────────
// Añade una respuesta sin rating a una reseña raíz
router.post('/:id/reviews/:reviewId/replies', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.reviewId)) {
      return res.status(400).json({ message: 'Invalid review id' });
    }

    const { content } = req.body;
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    if (!trimmedContent) {
      return res.status(400).json({ message: 'content is required' });
    }

    const game = await Game.findById(req.params.id).select('_id');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const parentReview = await Review.findOne({
      _id: req.params.reviewId,
      contentType: 'game',
      contentId: game._id,
      answerTo: null
    }).select('_id');

    if (!parentReview) {
      return res.status(404).json({ message: 'Parent review not found' });
    }

    const reply = await Review.create({
      user: req.userId,
      contentType: 'game',
      contentId: game._id,
      answerTo: parentReview._id,
      content: trimmedContent,
      rating: null
    });

    const populated = await Review.findById(reply._id).populate('user', 'name');
    return res.status(201).json(mapReview(populated));
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /api/games/:id/reviews/:reviewId ───────────────────
// Edita reseña/respuesta propia. En raíz permite ajustar rating y texto.
router.patch('/:id/reviews/:reviewId', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.reviewId)) {
      return res.status(400).json({ message: 'Invalid review id' });
    }

    const game = await Game.findById(req.params.id).select('_id');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const review = await Review.findOne({
      _id: req.params.reviewId,
      contentType: 'game',
      contentId: game._id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (String(review.user) !== String(req.userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const isRoot = review.answerTo === null;
    const nextContent = typeof req.body.content === 'string' ? req.body.content.trim() : null;
    const hasRatingUpdate = Object.prototype.hasOwnProperty.call(req.body, 'rating');

    if (nextContent !== null) {
      if (!nextContent) {
        return res.status(400).json({ message: 'content cannot be empty' });
      }
      review.content = nextContent;
    }

    if (hasRatingUpdate) {
      if (!isRoot) {
        return res.status(400).json({ message: 'Replies cannot have rating' });
      }

      const nextRating = req.body.rating;
      const isValidRating = Number.isInteger(nextRating) && nextRating >= 1 && nextRating <= 5;
      if (!isValidRating) {
        return res.status(400).json({ message: 'rating must be an integer between 1 and 5' });
      }
      review.rating = nextRating;
    }

    await review.save();

    if (isRoot) {
      await recalculateContentRating('game', game._id, Game);
    }

    const populated = await Review.findById(review._id).populate('user', 'name');
    return res.json(mapReview(populated));
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/games/:id/reviews/:reviewId ──────────────────
// Borra reseña/respuesta propia. Si es raíz, borra también respuestas.
router.delete('/:id/reviews/:reviewId', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.reviewId)) {
      return res.status(400).json({ message: 'Invalid review id' });
    }

    const game = await Game.findById(req.params.id).select('_id');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const review = await Review.findOne({
      _id: req.params.reviewId,
      contentType: 'game',
      contentId: game._id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (String(review.user) !== String(req.userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const isRoot = review.answerTo === null;

    if (isRoot) {
      await Review.deleteMany({
        $or: [
          { _id: review._id },
          { answerTo: review._id }
        ]
      });
      await recalculateContentRating('game', game._id, Game);
    } else {
      await review.deleteOne();
    }

    return res.json({ message: 'Review deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/games/:id/interaction ───────────────────────────
// Estado de interacción del usuario autenticado con este juego
router.get('/:id/interaction', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    const game = await Game.findById(req.params.id).select('_id');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const interaction = await Interaction.findOne({
      user: req.userId,
      contentType: 'game',
      contentId: game._id
    });

    const ownReview = await Review.findOne({
      user: req.userId,
      contentType: 'game',
      contentId: game._id,
      answerTo: null
    }).select('rating content');

    return res.json({
      watched: interaction?.watched || false,
      inWishlist: interaction?.inWishlist || false,
      rating: ownReview?.rating ?? null,
      reviewContent: ownReview?.content ?? null
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /api/games/:id/watched ─────────────────────────────
router.patch('/:id/watched', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    const { watched } = req.body;
    if (typeof watched !== 'boolean') {
      return res.status(400).json({ message: 'watched must be a boolean' });
    }

    const game = await Game.findById(req.params.id).select('_id');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const setPayload = {
      watched,
      watchedAt: watched ? new Date() : null
    };

    if (watched) {
      setPayload.inWishlist = false;
      setPayload.wishlistedAt = null;
    }

    const interaction = await Interaction.findOneAndUpdate(
      {
        user: req.userId,
        contentType: 'game',
        contentId: game._id
      },
      { $set: setPayload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const ownReview = await Review.findOne({
      user: req.userId,
      contentType: 'game',
      contentId: game._id,
      answerTo: null
    }).select('rating content');

    return res.json({
      watched: interaction.watched,
      inWishlist: interaction.inWishlist,
      rating: ownReview?.rating ?? null,
      reviewContent: ownReview?.content ?? null
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /api/games/:id/wishlist ────────────────────────────
router.patch('/:id/wishlist', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    const { inWishlist } = req.body;
    if (typeof inWishlist !== 'boolean') {
      return res.status(400).json({ message: 'inWishlist must be a boolean' });
    }

    const game = await Game.findById(req.params.id).select('_id');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const setPayload = {
      inWishlist,
      wishlistedAt: inWishlist ? new Date() : null
    };

    if (inWishlist) {
      setPayload.watched = false;
      setPayload.watchedAt = null;
    }

    const interaction = await Interaction.findOneAndUpdate(
      {
        user: req.userId,
        contentType: 'game',
        contentId: game._id
      },
      { $set: setPayload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const ownReview = await Review.findOne({
      user: req.userId,
      contentType: 'game',
      contentId: game._id,
      answerTo: null
    }).select('rating content');

    return res.json({
      watched: interaction.watched,
      inWishlist: interaction.inWishlist,
      rating: ownReview?.rating ?? null,
      reviewContent: ownReview?.content ?? null
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;