const router = require('express').Router();
const Movie  = require('../module/movies/movie.model');
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

async function recalculateMovieRating(movieId) {
  const targetId = new mongoose.Types.ObjectId(movieId);
  const stats = await Interaction.aggregate([
    {
      $match: {
        contentType: 'movie',
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

  await Movie.findByIdAndUpdate(movieId, {
    'rating.avg': avg,
    'rating.count': count
  });
}

// ── GET /api/movies ───────────────────────────────────────────
// Query params:
//   page    → número de página (default: 1)
//   limit   → resultados por página (default: 20)
//   search  → buscar por título (ej: ?search=matrix)
//   genre   → filtrar por género (ej: ?genre=Acción)
//   sort    → ordenación (ej: ?sort=rating_desc)
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const sort = SORT_OPTIONS[req.query.sort] || SORT_OPTIONS['rating_desc'];

    // Construimos el filtro dinámicamente según los params recibidos
    const filter = {};

    if (req.query.search) {
      // Búsqueda insensible a mayúsculas/acentos
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    if (req.query.genre) {
      // genres es un array — $in busca si el género está dentro del array
      filter.genres = { $in: [req.query.genre] };
    }

    // Ejecutamos query y count en paralelo para no hacer dos esperas seguidas
    const [movies, total] = await Promise.all([
      Movie.find(filter).sort(sort).skip(skip).limit(limit),
      Movie.countDocuments(filter)
    ]);

    res.json({
      data:       movies,
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

// ── GET /api/movies/genres/list ───────────────────────────────
// Devuelve todos los géneros distintos disponibles en la BD
// El frontend lo usa para pintar los botones de filtro del catálogo
router.get('/genres/list', async (req, res) => {
  try {
    const genres = await Movie.distinct('genres');
    res.json(genres.filter(g => g != null && g !== '').sort());
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/movies/:id ───────────────────────────────────────
// Devuelve el detalle completo de una película por su _id de MongoDB
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    res.json(movie);
  } catch (err) {
    // findById lanza CastError si el id no tiene formato válido de MongoDB
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid movie id' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/movies/:id/views ────────────────────────────────
// Devuelve solo el número de usuarios que marcaron la película como vista
router.get('/:id/views', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid movie id' });
    }

    const movie = await Movie.findById(req.params.id).select('_id');
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const viewsCount = await Interaction.countDocuments({
      contentType: 'movie',
      contentId: movie._id,
      watched: true
    });

    return res.json({
      contentType: 'movie',
      contentId: movie._id,
      viewsCount
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/movies/:id/interaction ──────────────────────────
// Estado de interacción del usuario autenticado con esta película
router.get('/:id/interaction', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid movie id' });
    }

    const movie = await Movie.findById(req.params.id).select('_id');
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const interaction = await Interaction.findOne({
      user: req.userId,
      contentType: 'movie',
      contentId: movie._id
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

// ── PATCH /api/movies/:id/watched ────────────────────────────
router.patch('/:id/watched', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid movie id' });
    }

    const { watched } = req.body;
    if (typeof watched !== 'boolean') {
      return res.status(400).json({ message: 'watched must be a boolean' });
    }

    const movie = await Movie.findById(req.params.id).select('_id');
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
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
        contentType: 'movie',
        contentId: movie._id
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

// ── PATCH /api/movies/:id/wishlist ───────────────────────────
router.patch('/:id/wishlist', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid movie id' });
    }

    const { inWishlist } = req.body;
    if (typeof inWishlist !== 'boolean') {
      return res.status(400).json({ message: 'inWishlist must be a boolean' });
    }

    const movie = await Movie.findById(req.params.id).select('_id');
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
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
        contentType: 'movie',
        contentId: movie._id
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

// ── PATCH /api/movies/:id/rating ─────────────────────────────
router.patch('/:id/rating', authRequired, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid movie id' });
    }

    const { rating } = req.body;
    const isNullRating = rating === null;
    const isValidRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;

    if (!isNullRating && !isValidRating) {
      return res.status(400).json({ message: 'rating must be null or an integer between 1 and 5' });
    }

    const movie = await Movie.findById(req.params.id).select('_id');
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const setPayload = isNullRating
      ? { rating: null, ratedAt: null }
      : { rating, ratedAt: new Date() };

    const interaction = await Interaction.findOneAndUpdate(
      {
        user: req.userId,
        contentType: 'movie',
        contentId: movie._id
      },
      { $set: setPayload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await recalculateMovieRating(movie._id);

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