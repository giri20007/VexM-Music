const router = require('express').Router();
const crypto = require('crypto');
const {
  generateToken,
  verifyToken,
  ADMIN_USERNAME,
  OWNER_TELEGRAM_ID,
} = require('../middleware/auth');
const {
  authenticateUser,
  createUser,
  findUserByUsername,
  findUserByTelegramId,
  findUserById,
  updateUser,
  toSafeUser,
} = require('../services/userService');
const { logActivity } = require('../services/activityLog');

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

// 1. Sign In / Login Endpoint (Supports Owner Spidey, Admins & Standard Users)
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

  try {
    const user = await authenticateUser(cleanUser, cleanPass);
    if (!user) {
      logActivity('AUTH_FAILED', { username: cleanUser }, req.ip);
      return res.status(401).json({
        error: true,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
      });
    }

    const token = generateToken(user);
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('spx_session_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    if (user.isAdmin || user.isOwner) {
      res.cookie('spx_admin_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    logActivity('USER_LOGIN_SUCCESS', { username: user.username, role: user.role }, req.ip);

    return res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return res.status(400).json({
      error: true,
      message: err.message || 'Login failed.',
    });
  }
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
  const displayName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username || `User ${telegramId}`;

  try {
    let user = await findUserByTelegramId(telegramId);
    if (!user) {
      // Check if user exists by username
      const existingUser = data.username ? await findUserByUsername(data.username) : null;
      if (existingUser) {
        user = await updateUser(existingUser.id, {
          telegramId,
          photoUrl: data.photo_url || existingUser.photoUrl,
          displayName: displayName || existingUser.displayName,
          role: isOwner ? 'OWNER' : existingUser.role,
        });
      } else {
        user = await createUser({
          username: data.username || `tg_${telegramId}`,
          displayName,
          role,
          telegramId,
          photoUrl: data.photo_url || '',
        });
      }
    } else {
      user = await updateUser(user.id, {
        displayName: displayName || user.displayName,
        photoUrl: data.photo_url || user.photoUrl,
        lastLoginAt: Date.now(),
      });
    }

    const safeUser = toSafeUser(user);
    const token = generateToken(safeUser);
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('spx_session_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    if (safeUser.isAdmin || safeUser.isOwner) {
      res.cookie('spx_admin_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    logActivity('TELEGRAM_LOGIN_SUCCESS', { telegramId, role: safeUser.role }, req.ip);

    res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('[TELEGRAM LOGIN ERROR]', err);
    res.status(500).json({ error: true, message: 'Failed to complete Telegram login', details: err.message });
  }
});

// 3. Sign Up / Register Endpoint
router.post('/signup', async (req, res) => {
  const { username, password, displayName, email } = req.body || {};

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

  try {
    const newUser = await createUser({
      username: cleanUser,
      password: cleanPass,
      displayName: cleanName,
      email: email ? String(email).trim() : null,
      role: 'USER',
    });

    const token = generateToken(newUser);
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('spx_session_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    logActivity('USER_SIGNUP_SUCCESS', { username: cleanUser }, req.ip);

    res.status(201).json({
      success: true,
      token,
      user: newUser,
    });
  } catch (err) {
    if (err.message?.includes('already taken')) {
      return res.status(409).json({
        error: true,
        code: 'USERNAME_EXISTS',
        message: 'Username is already taken.',
      });
    }
    return res.status(400).json({
      error: true,
      message: err.message || 'Registration failed.',
    });
  }
});

// 4. Current Session Validation
router.get('/me', async (req, res) => {
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

  // Retrieve fresh database record if available
  let user = null;
  try {
    if (decoded.id) user = await findUserById(decoded.id);
    if (!user && decoded.username) user = await findUserByUsername(decoded.username);
  } catch (err) {
    console.warn('[SESSION REFRESH WARN]', err.message);
  }

  const safeUser = user ? toSafeUser(user) : {
    ...decoded,
    isOwner: decoded.role === 'OWNER' || String(decoded.telegramId || decoded.id) === OWNER_TELEGRAM_ID || decoded.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase(),
    isAdmin: decoded.role === 'OWNER' || decoded.role === 'ADMIN' || decoded.isAdmin === true,
  };

  res.json({
    authenticated: true,
    user: safeUser,
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
