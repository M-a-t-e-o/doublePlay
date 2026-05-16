/**
 * routes/games.js
 *
 * Define los endpoints REST asociados al catálogo de videojuegos.
 *
 * Permite consultar videojuegos con paginación, búsqueda, filtrado y ordenación,
 * obtener detalles de un videojuego concreto, listar géneros, consultar el número
 * de usuarios que lo han marcado como jugado, gestionar reseñas y respuestas,
 * y modificar la interacción del usuario autenticado con un videojuego, como
 * marcarlo como jugado o añadirlo a la wishlist.
 */
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

/**
 * @swagger
 * /games:
 *   get:
 *     summary: Listar videojuegos
 *     description: Devuelve un catálogo paginado con búsqueda por título, filtro por género y ordenación.
 *     tags: [Games]
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - name: search
 *         in: query
 *         required: false
 *         description: Texto para buscar en el título.
 *         schema:
 *           type: string
 *           example: witcher
 *       - name: genre
 *         in: query
 *         required: false
 *         description: Género por el que filtrar.
 *         schema:
 *           type: string
 *           example: Action
 *       - name: sort
 *         in: query
 *         required: false
 *         description: Criterio de ordenación.
 *         schema:
 *           type: string
 *           enum: [rating_desc, rating_asc, date_desc, date_asc, title_asc, reviews_desc]
 *           example: rating_desc
 *     responses:
 *       200:
 *         description: Catálogo paginado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Game'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /games/genres/list:
 *   get:
 *     summary: Listar géneros de videojuegos
 *     description: Devuelve la lista de géneros distintos disponibles en el catálogo.
 *     tags: [Games]
 *     responses:
 *       200:
 *         description: Lista de géneros
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example: [Action]
 *       500:
 *         description: Error interno del servidor
 */

router.get('/genres/list', async (req, res) => {
  try {
    const genres = await Game.distinct('genres');
    res.json(genres.sort());
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/games/:id ────────────────────────────────────────

/**
 * @swagger
 * /games/{id}:
 *   get:
 *     summary: Obtener detalle de un videojuego
 *     description: Devuelve el documento completo del videojuego indicado por su ID de MongoDB.
 *     tags: [Games]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del videojuego.
 *         schema:
 *           type: string
 *           example: 60d5ecb54f421b2d1c8e4e1a
 *     responses:
 *       200:
 *         description: Detalle del videojuego
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Game'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Game not found
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /games/{id}/views:
 *   get:
 *     summary: Obtener número de visualizaciones
 *     description: Devuelve cuántos usuarios han marcado este contenido como jugado.
 *     tags: [Games]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del videojuego.
 *         schema:
 *           type: string
 *           example: 60d5ecb54f421b2d1c8e4e1a
 *     responses:
 *       200:
 *         description: Número de visualizaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contentType:
 *                   type: string
 *                   enum: [movie, game]
 *                   example: game
 *                 contentId:
 *                   type: string
 *                 viewsCount:
 *                   type: integer
 *                   example: 42
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Contenido no encontrado
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /games/{id}/reviews:
 *   get:
 *     summary: Listar reseñas de un videojuego
 *     description: Devuelve las reseñas raíz del contenido junto con sus respuestas.
 *     tags: [Games]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del videojuego.
 *         schema:
 *           type: string
 *           example: 60d5ecb54f421b2d1c8e4e1a
 *     responses:
 *       200:
 *         description: Lista de reseñas y respuestas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ReviewWithReplies'
 *                 total:
 *                   type: integer
 *                   example: 3
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Contenido no encontrado
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /games/{id}/reviews:
 *   post:
 *     summary: Crear una reseña raíz
 *     description: Crea una reseña raíz para el usuario autenticado. Cada usuario solo puede crear una reseña raíz por contenido.
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del videojuego.
 *         schema:
 *           type: string
 *           example: 60d5ecb54f421b2d1c8e4e1a
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, content]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               content:
 *                 type: string
 *                 example: Muy recomendable.
 *     responses:
 *       201:
 *         description: Reseña creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token ausente o inválido
 *       404:
 *         description: Contenido no encontrado
 *       409:
 *         description: Ya existe una reseña raíz del usuario para este contenido
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /games/{id}/reviews/{reviewId}/replies:
 *   post:
 *     summary: Responder a una reseña
 *     description: Añade una respuesta sin valoración a una reseña raíz.
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: Estoy de acuerdo con esta reseña.
 *     responses:
 *       201:
 *         description: Respuesta creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token ausente o inválido
 *       404:
 *         description: Contenido o reseña padre no encontrados
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /games/{id}/reviews/{reviewId}:
 *   patch:
 *     summary: Editar una reseña o respuesta propia
 *     description: Permite modificar el texto de una reseña o respuesta propia. En reseñas raíz también permite actualizar el rating.
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               content:
 *                 type: string
 *                 example: Texto actualizado de la reseña.
 *     responses:
 *       200:
 *         description: Reseña actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token ausente o inválido
 *       403:
 *         description: La reseña no pertenece al usuario autenticado
 *       404:
 *         description: Contenido o reseña no encontrados
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /games/{id}/reviews/{reviewId}:
 *   delete:
 *     summary: Eliminar una reseña o respuesta propia
 *     description: Elimina una reseña o respuesta del usuario autenticado. Si se elimina una reseña raíz, también se eliminan sus respuestas.
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reseña eliminada correctamente
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token ausente o inválido
 *       403:
 *         description: La reseña no pertenece al usuario autenticado
 *       404:
 *         description: Contenido o reseña no encontrados
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /games/{id}/interaction:
 *   get:
 *     summary: Consultar interacción del usuario con el contenido
 *     description: Devuelve si el usuario autenticado ha marcado el contenido como visto/jugado, si está en wishlist y su reseña propia si existe.
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado de interacción
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InteractionState'
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token ausente o inválido
 *       404:
 *         description: Contenido no encontrado
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /games/{id}/watched:
 *   patch:
 *     summary: Marcar contenido como jugado o no jugado
 *     description: Actualiza el estado watched del usuario autenticado para el contenido. Si se marca como true, se elimina de la wishlist.
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [watched]
 *             properties:
 *               watched:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InteractionState'
 *       400:
 *         description: ID inválido o watched no booleano
 *       401:
 *         description: Token ausente o inválido
 *       404:
 *         description: Contenido no encontrado
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /games/{id}/wishlist:
 *   patch:
 *     summary: Añadir o quitar contenido de la wishlist
 *     description: Actualiza el estado de wishlist del usuario autenticado. Si se añade a wishlist, se desmarca como visto/jugado.
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [inWishlist]
 *             properties:
 *               inWishlist:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InteractionState'
 *       400:
 *         description: ID inválido o inWishlist no booleano
 *       401:
 *         description: Token ausente o inválido
 *       404:
 *         description: Contenido no encontrado
 *       500:
 *         description: Error interno del servidor
 */

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