const router = require('express').Router();
const Movie  = require('../module/movies/movie.model');

// ── Mapa de opciones de ordenación ───────────────────────────
const SORT_OPTIONS = {
  'rating_desc':  { 'rating.avg': -1 },
  'rating_asc':   { 'rating.avg':  1 },
  'date_desc':    { releaseDate:  -1 },
  'date_asc':     { releaseDate:   1 },
  'title_asc':    { title:         1 },
  'reviews_desc': { numberReviews:-1 }
};

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



module.exports = router;