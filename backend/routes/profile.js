const router = require('express').Router();
const mongoose = require('mongoose');

const Interaction = require('../module/interaction/interaction.model');
const Movie = require('../module/movies/movie.model');
const Game = require('../module/games/game.model');
const User = require('../module/user/user.model');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

const LIST_DEFAULT_LIMIT = 20;
const LIST_MAX_LIMIT = 100;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(LIST_MAX_LIMIT, parseInt(query.limit, 10) || LIST_DEFAULT_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

function createMonthBuckets(referenceDate = new Date()) {
  const currentMonth = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });

  const buckets = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthDate = new Date(currentMonth);
    monthDate.setUTCMonth(currentMonth.getUTCMonth() - offset);

    const key = monthDate.toISOString().slice(0, 7);

    buckets.push({
      key,
      month: formatter.format(monthDate),
      movies: 0,
      games: 0
    });
  }

  return buckets;
}

function buildPercentages(rows) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  if (!total) {
    return [];
  }

  return rows.map((row) => ({
    genre: row._id,
    count: row.count,
    percentage: Number(((row.count / total) * 100).toFixed(2))
  }));
}

async function getContentList({
  userId,
  contentType,
  activityField,
  dateField,
  contentModel,
  coverField,
  page,
  limit,
  skip
}) {
  const filter = {
    user: userId,
    contentType,
    [activityField]: true,
    [dateField]: { $ne: null }
  };

  const sort = {
    [dateField]: -1,
    updatedAt: -1,
    createdAt: -1
  };

  const [interactions, total] = await Promise.all([
    Interaction.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('contentId watchedAt wishlistedAt createdAt updatedAt')
      .lean(),
    Interaction.countDocuments(filter)
  ]);

  if (interactions.length === 0) {
    return {
      data: [],
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  const contentIds = interactions.map((interaction) => interaction.contentId);
  const contents = await contentModel.find({ _id: { $in: contentIds } })
    .select('_id title genres rating.avg posterUrl coverUrl')
    .lean();

  const contentMap = new Map(contents.map((item) => [String(item._id), item]));

  const data = interactions
    .map((interaction) => {
      const content = contentMap.get(String(interaction.contentId));

      if (!content) {
        return null;
      }

      const interactedAt = interaction[dateField] || interaction.updatedAt || interaction.createdAt;

      return {
        id: String(content._id),
        title: content.title,
        cover: content[coverField] || null,
        genres: Array.isArray(content.genres) ? content.genres : [],
        avgRating: content.rating?.avg ?? null,
        interactedAt
      };
    })
    .filter(Boolean);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

async function getMonthlyDistribution(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return createMonthBuckets();
  }

  const objectId = new mongoose.Types.ObjectId(userId);

  const moviePipeline = [
    {
      $match: {
        user: objectId,
        contentType: 'movie',
        watched: true,
        watchedAt: { $ne: null }
      }
    },
    {
      $group: {
        _id: {
          month: {
            $dateToString: {
              format: '%Y-%m',
              date: '$watchedAt',
              timezone: 'UTC'
            }
          }
        },
        count: { $sum: 1 }
      }
    }
  ];

  const gamePipeline = [
    {
      $match: {
        user: objectId,
        contentType: 'game',
        watched: true,
        watchedAt: { $ne: null }
      }
    },
    {
      $group: {
        _id: {
          month: {
            $dateToString: {
              format: '%Y-%m',
              date: '$watchedAt',
              timezone: 'UTC'
            }
          }
        },
        count: { $sum: 1 }
      }
    }
  ];

  const [movieRows, gameRows] = await Promise.all([
    Interaction.aggregate(moviePipeline),
    Interaction.aggregate(gamePipeline)
  ]);

  const buckets = createMonthBuckets();
  const monthIndex = new Map(buckets.map((bucket, index) => [bucket.key, index]));

  for (const row of movieRows) {
    const index = monthIndex.get(row._id.month);
    if (index !== undefined) {
      buckets[index].movies = row.count;
    }
  }

  for (const row of gameRows) {
    const index = monthIndex.get(row._id.month);
    if (index !== undefined) {
      buckets[index].games = row.count;
    }
  }

  return buckets;
}

async function getGenreDistribution(userId, contentType, contentModel) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return [];
  }

  const rows = await Interaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        contentType,
        watched: true
      }
    },
    {
      $lookup: {
        from: contentModel.collection.name,
        localField: 'contentId',
        foreignField: '_id',
        as: 'content'
      }
    },
    {
      $unwind: '$content'
    },
    {
      $project: {
        genres: {
          $setUnion: [
            {
              $cond: [
                { $isArray: '$content.genres' },
                '$content.genres',
                []
              ]
            },
            []
          ]
        }
      }
    },
    {
      $unwind: '$genres'
    },
    {
      $group: {
        _id: '$genres',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1, _id: 1 }
    }
  ]);

  return buildPercentages(rows);
}

router.get('/me', async (req, res) => {
  try {
    const userId = req.userId;

    const [user, watchedMoviesCount, gamesPlayedCount, monthlyDistribution, movieGenreDistribution, gameGenreDistribution] = await Promise.all([
      User.findById(userId).select('name profilePicture').lean(),
      Interaction.countDocuments({ user: userId, contentType: 'movie', watched: true }),
      Interaction.countDocuments({ user: userId, contentType: 'game', watched: true }),
      getMonthlyDistribution(userId),
      getGenreDistribution(userId, 'movie', Movie),
      getGenreDistribution(userId, 'game', Game)
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      user: {
        id: String(user._id),
        name: user.name,
        hasProfilePicture: Boolean(user.profilePicture?.data)
      },
      counts: {
        watchedMovies: watchedMoviesCount,
        gamesPlayed: gamesPlayedCount
      },
      monthlyDistribution,
      movieGenreDistribution,
      gameGenreDistribution
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me/movies/watched', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const result = await getContentList({
      userId: req.userId,
      contentType: 'movie',
      activityField: 'watched',
      dateField: 'watchedAt',
      contentModel: Movie,
      coverField: 'posterUrl',
      page,
      limit,
      skip
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me/games/played', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const result = await getContentList({
      userId: req.userId,
      contentType: 'game',
      activityField: 'watched',
      dateField: 'watchedAt',
      contentModel: Game,
      coverField: 'coverUrl',
      page,
      limit,
      skip
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me/movies/wishlisted', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const result = await getContentList({
      userId: req.userId,
      contentType: 'movie',
      activityField: 'inWishlist',
      dateField: 'wishlistedAt',
      contentModel: Movie,
      coverField: 'posterUrl',
      page,
      limit,
      skip
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me/games/wishlisted', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const result = await getContentList({
      userId: req.userId,
      contentType: 'game',
      activityField: 'inWishlist',
      dateField: 'wishlistedAt',
      contentModel: Game,
      coverField: 'coverUrl',
      page,
      limit,
      skip
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;