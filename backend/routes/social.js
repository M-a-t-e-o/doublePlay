const router = require('express').Router();
const Friendship  = require('../module/user/friendship.model');
const Interaction = require('../module/interaction/interaction.model');
const Review      = require('../module/review/review.model');
const Movie       = require('../module/movies/movie.model');
const Game        = require('../module/games/game.model');
const User        = require('../module/user/user.model');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

// ── GET /api/social/feed ─────────────────────────────────────────────────────
// Devuelve los eventos recientes de los amigos del usuario autenticado.
// Cada evento tiene un tipo: 'watched' | 'wishlisted' | 'reviewed'
//
// Query params:
//   page  → número de página (default: 1)
//   limit → eventos por página (default: 20, max: 50)
router.get('/feed', async (req, res) => {
  try {
    const userId = req.userId;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);

    // ── 1. Obtener IDs de amigos aceptados ───────────────────────
    const friendships = await Friendship.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: 'accepted'
    }).select('sender receiver');

    const friendIds = friendships.map(f =>
      String(f.sender) === String(userId) ? f.receiver : f.sender
    );

    if (friendIds.length === 0) {
      return res.json({
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false }
      });
    }

    // ── 2. Obtener interacciones y reseñas en paralelo ───────────
    const [interactions, reviews] = await Promise.all([
      Interaction.find({
        user: { $in: friendIds },
        $or: [{ watched: true }, { inWishlist: true }]
      }).select('user contentType contentId watched watchedAt inWishlist wishlistedAt'),

      Review.find({
        user: { $in: friendIds },
        answerTo: null   // solo reseñas raíz, no respuestas
      }).select('user contentType contentId rating content createdAt')
    ]);

    // ── 3. Construir lista unificada de eventos ───────────────────
    // Cada interacción puede generar hasta 2 eventos (watched + wishlisted)
    const events = [];

    for (const interaction of interactions) {
      if (interaction.watched && interaction.watchedAt) {
        events.push({
          type:          'watched',
          date:          interaction.watchedAt,
          userId:        interaction.user,
          contentType:   interaction.contentType,
          contentId:     interaction.contentId,
          rating:        null,
          reviewContent: null
        });
      }
      if (interaction.inWishlist && interaction.wishlistedAt) {
        events.push({
          type:          'wishlisted',
          date:          interaction.wishlistedAt,
          userId:        interaction.user,
          contentType:   interaction.contentType,
          contentId:     interaction.contentId,
          rating:        null,
          reviewContent: null
        });
      }
    }

    for (const review of reviews) {
      events.push({
        type:          'reviewed',
        date:          review.createdAt,
        userId:        review.user,
        contentType:   review.contentType,
        contentId:     review.contentId,
        rating:        review.rating,
        reviewContent: review.content
      });
    }

    // ── 4. Ordenar por fecha desc y paginar ───────────────────────
    events.sort((a, b) => b.date - a.date);

    const total      = events.length;
    const totalPages = Math.ceil(total / limit) || 0;
    const paginated  = events.slice((page - 1) * limit, page * limit);

    if (paginated.length === 0) {
      return res.json({
        data: [],
        pagination: { total, page, limit, totalPages, hasNext: false, hasPrev: page > 1 }
      });
    }

    // ── 5. Populate usuarios (solo los de esta página) ────────────
    const uniqueUserIds = [...new Set(paginated.map(e => String(e.userId)))];
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select('name profilePicture');
    const userMap = new Map(users.map(u => [
      String(u._id),
      {
        _id: u._id,
        name: u.name,
        hasProfilePicture: Boolean(u.profilePicture && u.profilePicture.data)
      }
    ]));

    // ── 6. Populate contenido (2 queries máximo, agrupando por tipo) ─
    const movieIds = [...new Set(
      paginated.filter(e => e.contentType === 'movie').map(e => String(e.contentId))
    )];
    const gameIds = [...new Set(
      paginated.filter(e => e.contentType === 'game').map(e => String(e.contentId))
    )];

    const [movies, games] = await Promise.all([
      movieIds.length ? Movie.find({ _id: { $in: movieIds } }).select('title posterUrl genres') : [],
      gameIds.length  ? Game.find({ _id: { $in: gameIds  } }).select('title coverUrl genres')   : []
    ]);

    const contentMap = new Map();
    for (const m of movies) {
      contentMap.set(String(m._id), {
        _id:    m._id,
        type:   'movie',
        title:  m.title,
        cover:  m.posterUrl,
        genres: m.genres
      });
    }
    for (const g of games) {
      contentMap.set(String(g._id), {
        _id:    g._id,
        type:   'game',
        title:  g.title,
        cover:  g.coverUrl,
        genres: g.genres
      });
    }

    // ── 7. Ensamblar respuesta final ──────────────────────────────
    const data = paginated.map(e => {
      const event = {
        type:    e.type,
        date:    e.date,
        user:    userMap.get(String(e.userId))    || null,
        content: contentMap.get(String(e.contentId)) || null
      };
      if (e.type === 'reviewed') {
        event.rating        = e.rating;
        event.reviewContent = e.reviewContent;
      }
      return event;
    });

    return res.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;