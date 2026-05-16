/**
 * module/stats/stats.service.js
 *
 * Servicio encargado de calcular y recuperar las estadísticas globales
 * de la plataforma doublePlay.
 *
 * Calcula métricas de usuarios, crecimiento mensual, cantidad de contenido,
 * valoración media global, visualizaciones, distribución por géneros y contenido
 * mejor valorado.
 *
 * Utiliza una estrategia de caché temporal para evitar recalcular estadísticas
 * en cada petición administrativa.
 */
const mongoose  = require('mongoose');
const User        = require('../user/user.model');
const Movie       = require('../movies/movie.model');
const Game        = require('../games/game.model');
const Interaction = require('../interaction/interaction.model');
const Stats       = require('./stats.model');

const STATS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMonthBuckets(referenceDate = new Date()) {
  const currentMonth = new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    1
  ));

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC'
  });

  const buckets = [];
  for (let offset = 11; offset >= 0; offset--) {
    const d = new Date(currentMonth);
    d.setUTCMonth(currentMonth.getUTCMonth() - offset);
    buckets.push({
      key:      d.toISOString().slice(0, 7),
      month:    formatter.format(d),
      newUsers: 0,
      total:    0
    });
  }
  return buckets;
}

// ── Individual calculators ────────────────────────────────────────────────────

async function computeUserStats() {
  const totalUsers = await User.countDocuments();

  // New registrations per month for the last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 11);
  twelveMonthsAgo.setUTCDate(1);
  twelveMonthsAgo.setUTCHours(0, 0, 0, 0);

  const rows = await User.aggregate([
    { $match: { createdAt: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } },
        newUsers: { $sum: 1 }
      }
    }
  ]);

  const rowMap = new Map(rows.map(r => [r._id, r.newUsers]));
  const buckets = buildMonthBuckets();

  // Calculate cumulative total: start from users registered before the window
  const usersBeforeWindow = await User.countDocuments({ createdAt: { $lt: twelveMonthsAgo } });
  let running = usersBeforeWindow;

  for (const bucket of buckets) {
    const newThisMonth = rowMap.get(bucket.key) || 0;
    running += newThisMonth;
    bucket.newUsers = newThisMonth;
    bucket.total    = running;
  }

  return { total: totalUsers, growthLast12Months: buckets };
}

async function computeContentStats() {
  const [totalMovies, totalGames] = await Promise.all([
    Movie.countDocuments(),
    Game.countDocuments()
  ]);

  const total = totalMovies + totalGames;

  return {
    totalMovies,
    totalGames,
    total,
    moviesPercentage: total ? Number(((totalMovies / total) * 100).toFixed(2)) : 0,
    gamesPercentage:  total ? Number(((totalGames  / total) * 100).toFixed(2)) : 0
  };
}

async function computePlatformRating() {
  // Weighted average: sum(avg * count) / sum(count) across movies and games
  const pipeline = [
    { $match: { 'rating.count': { $gt: 0 } } },
    {
      $group: {
        _id:            null,
        weightedSum:    { $sum: { $multiply: ['$rating.avg', '$rating.count'] } },
        totalRatings:   { $sum: '$rating.count' }
      }
    }
  ];

  const [movieResult, gameResult] = await Promise.all([
    Movie.aggregate(pipeline),
    Game.aggregate(pipeline)
  ]);

  const mWeighted = movieResult[0]?.weightedSum  || 0;
  const mTotal    = movieResult[0]?.totalRatings || 0;
  const gWeighted = gameResult[0]?.weightedSum   || 0;
  const gTotal    = gameResult[0]?.totalRatings  || 0;

  const combinedTotal = mTotal + gTotal;
  const platformAvg   = combinedTotal
    ? Number(((mWeighted + gWeighted) / combinedTotal).toFixed(2))
    : 0;

  return { platformAvg };
}

async function computeViewStats() {
  const [movieViews, gameViews] = await Promise.all([
    Interaction.countDocuments({ contentType: 'movie', watched: true }),
    Interaction.countDocuments({ contentType: 'game',  watched: true })
  ]);

  return {
    total:  movieViews + gameViews,
    movies: movieViews,
    games:  gameViews
  };
}

async function computeGenreStats() {
  const genrePipeline = [
    { $unwind: '$genres' },
    { $group: { _id: '$genres', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $project: { _id: 0, genre: '$_id', count: 1 } }
  ];

  const [movieGenres, gameGenres] = await Promise.all([
    Movie.aggregate(genrePipeline),
    Game.aggregate(genrePipeline)
  ]);

  return { movies: movieGenres, games: gameGenres };
}

async function computeTopContent() {
  // Minimum rating count to appear in top (avoids 1-review 5-star entries)
  const MIN_RATINGS = 3;
  const TAKE        = 10; // fetch 10 from each, pick top 5 combined after merge

  const [topMovies, topGames] = await Promise.all([
    Movie.find({ 'rating.count': { $gte: MIN_RATINGS } })
      .sort({ 'rating.avg': -1, 'rating.count': -1 })
      .limit(TAKE)
      .select('_id title posterUrl rating')
      .lean(),
    Game.find({ 'rating.count': { $gte: MIN_RATINGS } })
      .sort({ 'rating.avg': -1, 'rating.count': -1 })
      .limit(TAKE)
      .select('_id title coverUrl rating')
      .lean()
  ]);

  const combined = [
    ...topMovies.map(m => ({
      id:          String(m._id),
      type:        'movie',
      title:       m.title,
      cover:       m.posterUrl || null,
      avgRating:   m.rating.avg,
      ratingCount: m.rating.count
    })),
    ...topGames.map(g => ({
      id:          String(g._id),
      type:        'game',
      title:       g.title,
      cover:       g.coverUrl || null,
      avgRating:   g.rating.avg,
      ratingCount: g.rating.count
    }))
  ];

  combined.sort((a, b) =>
    b.avgRating - a.avgRating || b.ratingCount - a.ratingCount
  );

  return combined.slice(0, 5);
}

// ── Main compute function ─────────────────────────────────────────────────────

async function computeStats() {
  const [users, content, ratings, views, genres, topContent] = await Promise.all([
    computeUserStats(),
    computeContentStats(),
    computePlatformRating(),
    computeViewStats(),
    computeGenreStats(),
    computeTopContent()
  ]);

  const doc = {
    _id:        'platform',
    computedAt: new Date(),
    users,
    content,
    ratings,
    views,
    genres,
    topContent
  };

  // Upsert the single stats document
  await Stats.findByIdAndUpdate('platform', doc, { upsert: true, new: true });

  console.log('[STATS] Platform stats recomputed at', doc.computedAt.toISOString());
  return doc;
}

// ── Public: get cached stats, recompute if stale ──────────────────────────────

async function getStats(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await Stats.findById('platform').lean();
    const isStale = !cached?.computedAt
      || (Date.now() - new Date(cached.computedAt).getTime()) > STATS_TTL_MS;

    if (!isStale) return cached;
  }

  return computeStats();
}

module.exports = { getStats, computeStats };