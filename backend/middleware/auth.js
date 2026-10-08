const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'spidey_x_flash_super_secret_jwt_key_2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Spidey';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MS710924';

async function verifyCredentials(username, password) {
  if (!username || !password) return false;
  return (
    (username === ADMIN_USERNAME || username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) &&
    password === ADMIN_PASSWORD
  );
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function extractToken(req) {
  // 1. Check HTTP-only cookies
  if (req.cookies?.spx_session_token) {
    return req.cookies.spx_session_token;
  }
  if (req.cookies?.spx_admin_token) {
    return req.cookies.spx_admin_token;
  }
  // 2. Check Authorization Header
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }
  return null;
}

/**
 * Middleware: Requires a valid authenticated session (user or admin)
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: true,
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.',
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      error: true,
      code: 'INVALID_SESSION',
      message: 'Session is invalid or has expired. Please sign in again.',
    });
  }

  const isAdmin =
    decoded.role === 'ADMIN' ||
    decoded.role === 'admin' ||
    decoded.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase();

  req.user = {
    ...decoded,
    isAdmin,
    role: isAdmin ? 'ADMIN' : (decoded.role || 'user'),
  };
  req.adminUser = req.user;

  next();
}

/**
 * Middleware: Strictly requires Admin privileges (Spidey / MS710924)
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return requireAuth(req, res, () => {
      checkAdminPermission(req, res, next);
    });
  }
  checkAdminPermission(req, res, next);
}

function checkAdminPermission(req, res, next) {
  const user = req.user;
  const isAuthorizedAdmin =
    user &&
    (user.role === 'ADMIN' ||
      user.role === 'admin' ||
      user.isAdmin === true ||
      user.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase());

  if (!isAuthorizedAdmin) {
    return res.status(403).json({
      error: true,
      code: 'FORBIDDEN',
      message: 'Access Denied: Admin privileges are required.',
    });
  }

  req.adminUser = user;
  next();
}

const authenticateAdmin = requireAdmin;

module.exports = {
  requireAuth,
  requireAdmin,
  authenticateAdmin,
  verifyCredentials,
  generateToken,
  verifyToken,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
};
