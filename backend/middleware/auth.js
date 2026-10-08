const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'spidey_x_flash_super_secret_jwt_key_2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'spidey';

// Cache the computed hash for fallback password if only plaintext is provided
let computedHash = null;
function getAdminPasswordHash() {
  if (process.env.ADMIN_PASSWORD_HASH) {
    return process.env.ADMIN_PASSWORD_HASH;
  }
  // If user supplied ADMIN_PASSWORD in plain text, hash it
  if (process.env.ADMIN_PASSWORD) {
    if (!computedHash) {
      computedHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    }
    return computedHash;
  }
  // Default development fallback password: "admin"
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function authenticateAdmin(req, res, next) {
  let token = null;

  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies.spx_admin_token) {
    token = req.cookies.spx_admin_token;
  }

  // 2. Check Authorization header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      error: true,
      code: 'UNAUTHORIZED',
      message: 'Admin authentication required',
    });
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin' || decoded.username !== ADMIN_USERNAME) {
    return res.status(401).json({
      error: true,
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired admin session',
    });
  }

  req.adminUser = decoded;
  next();
}

module.exports = {
  authenticateAdmin,
  verifyCredentials,
  generateToken,
  ADMIN_USERNAME,
};
