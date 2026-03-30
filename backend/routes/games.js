const router = require('express').Router();
const Game   = require('../module/games/game.model');
const Interaction = require('../module/interaction/interaction.model');
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

async function recalculateGameRating(gameId) {
  const targetId = new mongoose.Types.ObjectId(gameId);
  const stats = await Interaction.aggregate([
    {
      $match: {
        contentType: 'game',
        contentId: targetId,
        rating: { $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const avg = stats[0] ? Number(stats[0].avg.toFixed(2)) : 0;
  const count = stats[0] ? stats[0].count : 0;

  await Game.findByIdAndUpdate(gameId, {
    'rating.avg': avg,
    'rating.count': count
  });
}

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

    return res.json({
      watched: interaction?.watched || false,
      inWishlist: interaction?.inWishlist || false,
      rating: interaction?.rating ?? null
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

    return res.json({
      watched: interaction.watched,
      inWishlist: interaction.inWishlist,
      rating: interaction.rating
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

    return res.json({
      watched: interaction.watched,
      inWishlist: interaction.inWishlist,
      rating: interaction.rating
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /api/games/:id/rating ──────────────────────────────
router.patch('/:id/rating', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    const { rating } = req.body;
    const isNullRating = rating === null;
    const isValidRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;

    if (!isNullRating && !isValidRating) {
      return res.status(400).json({ message: 'rating must be null or an integer between 1 and 5' });
    }

    const game = await Game.findById(req.params.id).select('_id');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const setPayload = isNullRating
      ? { rating: null, ratedAt: null }
      : { rating, ratedAt: new Date() };

    const interaction = await Interaction.findOneAndUpdate(
      {
        user: req.userId,
        contentType: 'game',
        contentId: game._id
      },
      { $set: setPayload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await recalculateGameRating(game._id);

    return res.json({
      watched: interaction.watched,
      inWishlist: interaction.inWishlist,
      rating: interaction.rating
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;