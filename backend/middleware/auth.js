const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId   = payload.id;
    req.userRole = payload.role;   // 'user' | 'admin'
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// Use after authRequired to restrict a route to admins only
function adminRequired(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: admin access required' });
  }
  return next();
}

module.exports = { authRequired, adminRequired };