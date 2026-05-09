const router = require('express').Router();
const { authRequired, adminRequired } = require('../middleware/auth');

// Todas las rutas de este fichero exigen token válido + rol admin
router.use(authRequired);
router.use(adminRequired);

// GET /api/admin
// Ruta base para verificar acceso. Devuelve confirmación con los datos del token.
router.get('/', (req, res) => {
  res.json({
    message: 'Admin access granted',
    userId:   req.userId,
    userRole: req.userRole
  });
});

module.exports = router;