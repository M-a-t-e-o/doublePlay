const router = require('express').Router();
const { authRequired, adminRequired } = require('../middleware/auth');
const { getStats } = require('../module/stats/stats.service');

// Todas las rutas de este fichero exigen token válido + rol admin
router.use(authRequired);
router.use(adminRequired);

// GET /api/admin
// Ruta base para verificar acceso.
router.get('/', (req, res) => {
  res.json({
    message:  'Admin access granted',
    userId:   req.userId,
    userRole: req.userRole
  });
});

// GET /api/admin/stats
// Devuelve los stats cacheados de la plataforma.
// Si el caché tiene más de 24h o no existe, recalcula antes de responder.
// Query param: ?refresh=true  → fuerza recálculo aunque el caché sea reciente
router.get('/stats', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const stats = await getStats(forceRefresh);
    return res.json(stats);
  } catch (err) {
    console.error('[ADMIN] Error fetching stats:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;