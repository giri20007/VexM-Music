const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'spidey_x_flash_super_secret_jwt_key_2026';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '5216415651';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'spidey';

// Cache computed hash for fallback dev password
let computedHash = null;
function getAdminPasswordHash() {
  if (process.env.ADMIN_PASSWORD_HASH) {
    return process.env.ADMIN_PASSWORD_HASH;
  }
  if (process.env.ADMIN_PASSWORD) {
    if (!computedHash) {
      computedHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    }
    return computedHash;
  }
  if (!computedHash) {
    computedHash = bcrypt.hashSync('admin', 10);
  }
  return computedHash;
}

async function verifyCredentials(username, password) {
  if (!username || !password) return false;
  if (username !== ADMIN_USERNAME) return false;
  const hash = getAdminPasswordHash();
  return bcrypt.compare(password, hash);
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
      message: 'Authentication required. Please log in with Telegram.',
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      error: true,
      code: 'INVALID_SESSION',
      message: 'Session is invalid or has expired. Please log in again.',
    });
  }

  const isAdmin = String(decoded.telegramId || decoded.id) === String(ADMIN_TELEGRAM_ID) || decoded.role === 'admin';

  req.user = {
    ...decoded,
    isAdmin,
    role: isAdmin ? 'admin' : (decoded.role || 'user'),
  };
  req.adminUser = req.user; // Compatibility

  next();
}

/**
 * Middleware: Strictly requires Admin privileges (Telegram User ID 5216415651)
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    // If requireAuth hasn't run yet, run it
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
    (String(user.telegramId || user.id) === String(ADMIN_TELEGRAM_ID) ||
      (user.role === 'admin' && (user.username === ADMIN_USERNAME || String(user.telegramId) === String(ADMIN_TELEGRAM_ID))));

  if (!isAuthorizedAdmin) {
    return res.status(403).json({
      error: true,
      code: 'FORBIDDEN',
      message: 'Access Denied: Admin privileges are strictly restricted to authorized Telegram accounts.',
    });
  }

  req.adminUser = user;
  next();
}

// Backward compatibility alias for authenticateAdmin
const authenticateAdmin = requireAdmin;

module.exports = {
  requireAuth,
  requireAdmin,
  authenticateAdmin,
  verifyCredentials,
  generateToken,
  verifyToken,
  ADMIN_TELEGRAM_ID,
  ADMIN_USERNAME,
};
