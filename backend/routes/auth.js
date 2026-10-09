const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {
  generateToken,
  verifyToken,
  verifyCredentials,
  ADMIN_USERNAME,
  OWNER_TELEGRAM_ID,
} = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// In-memory / persistent user registry
function getRegisteredUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveRegisteredUsers(users) {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Could not persist users:', err.message);
  }
}

/**
 * Verify official Telegram Web Login widget HMAC-SHA256 signature
 */
function verifyTelegramWidgetData(data, botToken) {
  if (!data || !data.hash || !botToken) return false;
  const { hash, ...rest } = data;

  // Check auth_date not older than 24 hours (86,400s)
  const authDate = Number(data.auth_date);
  if (!authDate || (Date.now() / 1000) - authDate > 86400) {
    return false;
  }

  const checkString = Object.keys(rest)
    .sort()
    .filter(k => rest[k] !== undefined && rest[k] !== null && rest[k] !== '')
    .map(k => `${k}=${rest[k]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
  return calculatedHash === hash;
}

// 1. Sign In / Login Endpoint (Supports Admin Spidey & Standard Users)
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: true,
      code: 'MISSING_CREDENTIALS',
      message: 'Username and password required',
    });
  }

  const cleanUser = String(username).trim();
  const cleanPass = String(password);

  // Check Admin / Owner Credentials (Spidey)
  if (cleanUser.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
    const isValidAdmin = await verifyCredentials(cleanUser, cleanPass);
    if (isValidAdmin) {
      const ownerPayload = {
        id: 'owner_spidey',
        username: 'Spidey',
        displayName: 'Spidey',
        role: 'OWNER',
        isAdmin: true,
        isOwner: true,
      };

      const token = generateToken(ownerPayload);
      const isProd = process.env.NODE_ENV === 'production';

      res.cookie('spx_session_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });
      res.cookie('spx_admin_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      logActivity('OWNER_LOGIN_SUCCESS', { username: 'Spidey' }, req.ip);

      return res.json({
        success: true,
        token,
        user: ownerPayload,
      });
    }

    logActivity('ADMIN_LOGIN_FAILED', { username: cleanUser }, req.ip);
    return res.status(401).json({
      error: true,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid administrator credentials.',
    });
  }

  // Standard User Login
  const users = getRegisteredUsers();
  const matched = users.find(
    u => u.username.toLowerCase() === cleanUser.toLowerCase()
  );

  if (matched) {
    let passValid = false;
    if (matched.passwordHash) {
      passValid = await bcrypt.compare(cleanPass, matched.passwordHash);
    } else if (matched.password) {
      passValid = matched.password === cleanPass;
    }

    if (passValid) {
      const userPayload = {
        id: matched.id,
        username: matched.username,
        displayName: matched.displayName || matched.username,
        role: 'USER',
        isAdmin: false,
        isOwner: false,
      };

      const token = generateToken(userPayload);
      const isProd = process.env.NODE_ENV === 'production';

      res.cookie('spx_session_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      logActivity('USER_LOGIN_SUCCESS', { username: matched.username }, req.ip);

      return res.json({
        success: true,
        token,
        user: userPayload,
      });
    }
  }

  logActivity('AUTH_FAILED', { username: cleanUser }, req.ip);
  return res.status(401).json({
    error: true,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid username or password.',
  });
});

// 2. Telegram Official Login Widget Endpoint
router.post('/telegram', async (req, res) => {
  const data = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!data || !data.id || !data.hash) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_PAYLOAD',
      message: 'Missing Telegram authentication payload.',
    });
  }

  const isValid = verifyTelegramWidgetData(data, botToken);
  if (!isValid) {
    logActivity('TELEGRAM_AUTH_FAILED', { telegramId: data.id }, req.ip);
    return res.status(401).json({
      error: true,
      code: 'INVALID_TELEGRAM_HASH',
      message: 'Telegram authentication could not be verified.',
    });
  }

  const telegramId = String(data.id);
  const isOwner = telegramId === OWNER_TELEGRAM_ID;
  const role = isOwner ? 'OWNER' : 'USER';

  const userPayload = {
    id: `tg_${telegramId}`,
    telegramId,
    username: data.username || `tg_${telegramId}`,
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    displayName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username || `User ${telegramId}`,
    photoUrl: data.photo_url || '',
    role,
    isAdmin: isOwner,
    isOwner,
  };

  const token = generateToken(userPayload);
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('spx_session_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  if (isOwner) {
    res.cookie('spx_admin_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  // Record user into user registry
  const users = getRegisteredUsers();
  const existingIdx = users.findIndex(u => String(u.telegramId) === telegramId);
  if (existingIdx >= 0) {
    users[existingIdx] = {
      ...users[existingIdx],
      username: data.username || users[existingIdx].username,
      displayName: userPayload.displayName,
      photoUrl: data.photo_url || users[existingIdx].photoUrl,
      lastActive: Date.now(),
    };
  } else {
    users.push({
      id: userPayload.id,
      telegramId,
      username: data.username || `tg_${telegramId}`,
      displayName: userPayload.displayName,
      photoUrl: data.photo_url || '',
      role,
      createdAt: Date.now(),
      lastActive: Date.now(),
      status: 'active',
    });
  }
  saveRegisteredUsers(users);

  logActivity('TELEGRAM_LOGIN_SUCCESS', { telegramId, role }, req.ip);

  res.json({
    success: true,
    token,
    user: userPayload,
  });
});

// 3. Sign Up / Register Endpoint
router.post('/signup', async (req, res) => {
  const { username, password, displayName } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: true,
      code: 'MISSING_FIELDS',
      message: 'Username and password required.',
    });
  }

  const cleanUser = String(username).trim();
  const cleanPass = String(password);
  const cleanName = displayName ? String(displayName).trim() : cleanUser;

  if (cleanUser.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
    return res.status(400).json({
      error: true,
      code: 'RESERVED_USERNAME',
      message: 'This username is reserved. Please sign in as administrator.',
    });
  }

  const users = getRegisteredUsers();
  if (users.some(u => u.username.toLowerCase() === cleanUser.toLowerCase())) {
    return res.status(409).json({
      error: true,
      code: 'USERNAME_EXISTS',
      message: 'Username is already taken.',
    });
  }

  const passwordHash = await bcrypt.hash(cleanPass, 10);
  const newUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    username: cleanUser,
    passwordHash,
    displayName: cleanName,
    role: 'USER',
    createdAt: Date.now(),
    lastActive: Date.now(),
    status: 'active',
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  const userPayload = {
    id: newUser.id,
    username: newUser.username,
    displayName: newUser.displayName,
    role: 'USER',
    isAdmin: false,
    isOwner: false,
  };

  const token = generateToken(userPayload);
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('spx_session_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  logActivity('USER_SIGNUP_SUCCESS', { username: cleanUser }, req.ip);

  res.json({
    success: true,
    token,
    user: userPayload,
  });
});

// 4. Current Session Validation
router.get('/me', (req, res) => {
  let token = null;

  if (req.cookies && req.cookies.spx_session_token) {
    token = req.cookies.spx_session_token;
  } else if (req.cookies && req.cookies.spx_admin_token) {
    token = req.cookies.spx_admin_token;
  }

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      authenticated: false,
      user: null,
      message: 'No active session',
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      authenticated: false,
      user: null,
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

  res.json({
    authenticated: true,
    user: {
      ...decoded,
      role,
      isAdmin,
      isOwner,
    },
  });
});

// 5. Logout
router.post('/logout', (req, res) => {
  res.clearCookie('spx_session_token', { path: '/' });
  res.clearCookie('spx_admin_token', { path: '/' });
  logActivity('USER_LOGOUT', {}, req.ip);
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
