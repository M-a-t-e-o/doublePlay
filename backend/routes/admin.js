/**
 * routes/admin.js
 *
 * Define los endpoints de administración de la plataforma.
 *
 * Permite comprobar el acceso de un usuario administrador y consultar
 * estadísticas globales de doublePlay, incluyendo usuarios, contenido,
 * visualizaciones, géneros, valoraciones y contenido destacado.
 *
 * Todas las rutas de este módulo requieren autenticación mediante JWT
 * y autorización con rol de administrador.
 */
const router = require('express').Router();
const { authRequired, adminRequired } = require('../middleware/auth');
const { getStats } = require('../module/stats/stats.service');
const logger = require('../utils/logger');

// Todas las rutas de este fichero exigen token válido + rol admin
router.use(authRequired);
router.use(adminRequired);

// GET /api/admin
// Ruta base para verificar acceso.

/**
 * @swagger
 * /admin:
 *   get:
 *     summary: Comprobar acceso de administrador
 *     description: Devuelve información básica del usuario autenticado si tiene rol de administrador.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Acceso concedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Admin access granted
 *                 userId:
 *                   type: string
 *                   example: 60d5ecb54f421b2d1c8e4e1a
 *                 userRole:
 *                   type: string
 *                   example: admin
 *       401:
 *         description: Token ausente o inválido
 *       403:
 *         description: El usuario autenticado no tiene rol de administrador
 *       500:
 *         description: Error interno del servidor
 */

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

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Obtener estadísticas globales de la plataforma
 *     description: Devuelve las estadísticas cacheadas o recalculadas de la plataforma. Permite forzar el recálculo mediante el parámetro refresh=true.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: refresh
 *         in: query
 *         required: false
 *         description: Fuerza el recálculo de estadísticas si vale true.
 *         schema:
 *           type: boolean
 *           example: true
 *     responses:
 *       200:
 *         description: Estadísticas globales devueltas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminStats'
 *       401:
 *         description: Token ausente o inválido
 *       403:
 *         description: El usuario autenticado no tiene rol de administrador
 *       500:
 *         description: Error interno del servidor
 */

router.get('/stats', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const stats = await getStats(forceRefresh);
    return res.json(stats);
  } catch (err) {
    logger.error('[ADMIN] Error fetching stats', { error: err.message, stack: err.stack });
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;