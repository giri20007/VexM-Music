const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'spidey_x_flash_super_secret_jwt_key_2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Spidey';
const OWNER_TELEGRAM_ID = process.env.OWNER_TELEGRAM_ID || '5216415651';

// Pre-computed bcrypt hash for owner password MS710924 (cost factor 10)
const ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  '$2b$10$xxh1TMl8DSYCW5nbg10t..bGfnC/vB/dtLiq7QwbGHth8ShUtp1aG';

const { authenticateUser, findUserByUsername } = require('../services/userService');

async function verifyCredentials(username, password) {
  if (!username || !password) return false;
  const cleanUser = String(username).trim().toLowerCase();
  const rawPass = String(password).trim();

  // 1. Direct match with database authentication
  try {
    const user = await authenticateUser(cleanUser, rawPass);
    if (user && (user.isOwner || user.isAdmin)) {
      return true;
    }
  } catch (err) {
    console.error('[AUTH VERIFY ERROR]', err.message);
  }

  // 2. Direct match with Admin username & fallback password
  const validUsers = [
    ADMIN_USERNAME.toLowerCase(),
    'spidey',
    'admin',
    'owner',
  ];
  if (validUsers.includes(cleanUser)) {
    if (
      rawPass === 'MS710924' ||
      rawPass === 'ms710924' ||
      (process.env.ADMIN_PASSWORD && rawPass === process.env.ADMIN_PASSWORD.trim())
    ) {
      return true;
    }
    try {
      return await bcrypt.compare(rawPass, ADMIN_PASSWORD_HASH);
    } catch {
      return false;
    }
  }

  return false;
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
 * Middleware: Requires a valid authenticated session (user, admin, or owner)
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
      message: 'Your session has expired. Please sign in again.',
    });
  }

  const isOwner =
    String(decoded.telegramId || decoded.id) === OWNER_TELEGRAM_ID ||
    decoded.role === 'OWNER' ||
    decoded.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase();

  const isAdmin =
    isOwner ||
    decoded.role === 'ADMIN' ||
    decoded.role === 'admin' ||
    decoded.isAdmin === true;

  const role = isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : (decoded.role || 'USER'));

  req.user = {
    ...decoded,
    role,
    isAdmin,
    isOwner,
  };
  req.adminUser = req.user;

  next();
}

/**
 * Middleware: Strictly requires Admin or Owner privileges
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
  const isAuthorized =
    user &&
    (user.isOwner ||
      user.isAdmin ||
      user.role === 'OWNER' ||
      user.role === 'ADMIN' ||
      user.role === 'admin' ||
      String(user.telegramId || user.id) === OWNER_TELEGRAM_ID ||
      user.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase());

  if (!isAuthorized) {
    return res.status(403).json({
      error: true,
      code: 'FORBIDDEN',
      message: 'You do not have permission to access the administrator panel.',
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
  OWNER_TELEGRAM_ID,
};
