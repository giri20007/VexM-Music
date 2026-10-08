const router = require('express').Router();
const crypto = require('crypto');
const { generateToken, verifyToken, ADMIN_TELEGRAM_ID } = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
let cachedBotUsername = process.env.TELEGRAM_BOT_USERNAME || '';

// Fetch and cache Bot username on first request
async function getBotUsername() {
  if (cachedBotUsername) return cachedBotUsername;
  if (!BOT_TOKEN) return '';
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    if (res.ok) {
      const data = await res.json();
      if (data.result && data.result.username) {
        cachedBotUsername = data.result.username;
        return cachedBotUsername;
      }
    }
  } catch (err) {
    console.warn('Could not fetch bot username from Telegram API:', err.message);
  }
  return '';
}

// 1. Get Public Auth Configuration (Bot Username for Telegram Login Widget)
router.get('/config', async (_req, res) => {
  const botUsername = await getBotUsername();
  res.json({
    botUsername,
    hasBotToken: Boolean(BOT_TOKEN),
  });
});

/**
 * Verify Telegram Login Widget authentication payload
 * Data format: { id, first_name, last_name, username, photo_url, auth_date, hash }
 */
function verifyTelegramWidgetAuth(data) {
  if (!data || !data.hash || !data.id || !data.auth_date) {
    return { valid: false, reason: 'Missing required Telegram auth fields' };
  }

  if (!BOT_TOKEN) {
    return { valid: false, reason: 'TELEGRAM_BOT_TOKEN is not configured on server' };
  }

  // Check auth_date not older than 24 hours (86400 seconds)
  const now = Math.floor(Date.now() / 1000);
  if (now - Number(data.auth_date) > 86400) {
    return { valid: false, reason: 'Telegram authentication data has expired' };
  }

  // 1. Generate secret key: SHA256(BOT_TOKEN)
  const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest();

  // 2. Build data_check_string from all fields except 'hash', sorted alphabetically
  const dataCheckArr = [];
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'hash' && value !== undefined && value !== null) {
      dataCheckArr.push(`${key}=${value}`);
    }
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join('\n');

  // 3. Compute HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  if (hmac !== data.hash) {
    return { valid: false, reason: 'Invalid Telegram cryptographic signature' };
  }

  return { valid: true };
}

/**
 * Verify Telegram WebApp initData authentication payload
 */
function verifyTelegramWebAppAuth(initData) {
  if (!initData || typeof initData !== 'string') {
    return { valid: false, reason: 'Missing initData string' };
  }
  if (!BOT_TOKEN) {
    return { valid: false, reason: 'TELEGRAM_BOT_TOKEN is not configured on server' };
  }

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) {
    return { valid: false, reason: 'Missing hash in initData' };
  }

  urlParams.delete('hash');
  const dataCheckArr = [];
  for (const [key, value] of urlParams.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join('\n');

  // Secret key for WebApp initData is HMAC-SHA256("WebAppData", BOT_TOKEN)
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  if (hmac !== hash) {
    return { valid: false, reason: 'Invalid WebApp signature' };
  }

  let user = null;
  const userStr = urlParams.get('user');
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch { /* ignore */ }
  }

  return { valid: true, user, authDate: urlParams.get('auth_date') };
}

// 2. Authenticate with Telegram (Widget or WebApp)
router.post('/telegram', async (req, res) => {
  const body = req.body || {};
  let telegramUser = null;

  if (body.initData) {
    // WebApp flow
    const verification = verifyTelegramWebAppAuth(body.initData);
    if (!verification.valid) {
      logActivity('AUTH_FAILED', { reason: verification.reason }, req.ip);
      return res.status(401).json({
        error: true,
        code: 'INVALID_TELEGRAM_AUTH',
        message: verification.reason,
      });
    }
    telegramUser = verification.user;
  } else if (body.hash && body.id) {
    // Widget flow
    const verification = verifyTelegramWidgetAuth(body);
    if (!verification.valid) {
      logActivity('AUTH_FAILED', { reason: verification.reason }, req.ip);
      return res.status(401).json({
        error: true,
        code: 'INVALID_TELEGRAM_AUTH',
        message: verification.reason,
      });
    }
    telegramUser = {
      id: body.id,
      first_name: body.first_name,
      last_name: body.last_name,
      username: body.username,
      photo_url: body.photo_url,
    };
  } else {
    return res.status(400).json({
      error: true,
      code: 'MISSING_AUTH_DATA',
      message: 'Telegram authentication data required',
    });
  }

  if (!telegramUser || !telegramUser.id) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_USER_DATA',
      message: 'Could not extract Telegram user details',
    });
  }

  const telegramIdStr = String(telegramUser.id);
  const isAdmin = telegramIdStr === String(ADMIN_TELEGRAM_ID);
  const role = isAdmin ? 'admin' : 'user';

  const userPayload = {
    id: telegramUser.id,
    telegramId: telegramIdStr,
    firstName: telegramUser.first_name || '',
    lastName: telegramUser.last_name || '',
    username: telegramUser.username || '',
    photoUrl: telegramUser.photo_url || '',
    role,
    isAdmin,
  };

  const token = generateToken(userPayload);
  const isProd = process.env.NODE_ENV === 'production';

  // Set secure HTTP-Only cookie for 30 days
  res.cookie('spx_session_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  logActivity('USER_LOGIN_SUCCESS', {
    telegramId: telegramIdStr,
    username: telegramUser.username,
    isAdmin,
  }, req.ip);

  res.json({
    success: true,
    token, // For Authorization header fallback
    user: userPayload,
  });
});

// 3. Current Session Validation
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
      message: 'Session expired or invalid',
    });
  }

  // Re-verify admin status dynamically
  const isAdmin = String(decoded.telegramId || decoded.id) === String(ADMIN_TELEGRAM_ID) || decoded.role === 'admin';

  res.json({
    authenticated: true,
    user: {
      ...decoded,
      isAdmin,
      role: isAdmin ? 'admin' : (decoded.role || 'user'),
    },
  });
});

// 4. Logout
router.post('/logout', (req, res) => {
  res.clearCookie('spx_session_token', { path: '/' });
  res.clearCookie('spx_admin_token', { path: '/' });
  logActivity('USER_LOGOUT', {}, req.ip);
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
