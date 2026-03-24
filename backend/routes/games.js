const router = require('express').Router();
const Game   = require('../module/games/game.model');

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



module.exports = router;