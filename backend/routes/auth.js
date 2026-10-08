const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { generateToken, verifyToken, ADMIN_USERNAME, ADMIN_PASSWORD } = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// In-memory / persistent user cache
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

// 1. Sign In / Login Endpoint (Supports Admin Spidey/MS710924 & Standard Users)
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

  // Check Hardcoded Admin Access (Spidey / MS710924)
  if (
    (cleanUser === ADMIN_USERNAME || cleanUser.toLowerCase() === ADMIN_USERNAME.toLowerCase()) &&
    cleanPass === ADMIN_PASSWORD
  ) {
    const adminPayload = {
      id: 'admin_spidey',
      username: 'Spidey',
      displayName: 'Spidey (Admin)',
      role: 'ADMIN',
      isAdmin: true,
    };

    const token = generateToken(adminPayload);
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

    logActivity('ADMIN_LOGIN_SUCCESS', { username: 'Spidey' }, req.ip);

    return res.json({
      success: true,
      token,
      user: adminPayload,
    });
  }

  // Standard User Login
  const users = getRegisteredUsers();
  const matched = users.find(
    u => u.username.toLowerCase() === cleanUser.toLowerCase() && u.password === cleanPass
  );

  if (matched) {
    const userPayload = {
      id: matched.id,
      username: matched.username,
      displayName: matched.displayName || matched.username,
      role: 'user',
      isAdmin: false,
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

  logActivity('AUTH_FAILED', { username: cleanUser }, req.ip);
  return res.status(401).json({
    error: true,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid username or password',
  });
});

// 2. Sign Up / Register Endpoint
router.post('/signup', async (req, res) => {
  const { username, password, displayName } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: true,
      code: 'MISSING_FIELDS',
      message: 'Username and password required',
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
      message: 'Username is already taken',
    });
  }

  const newUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    username: cleanUser,
    password: cleanPass,
    displayName: cleanName,
    role: 'user',
    createdAt: Date.now(),
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  const userPayload = {
    id: newUser.id,
    username: newUser.username,
    displayName: newUser.displayName,
    role: 'user',
    isAdmin: false,
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

  const isAdmin =
    decoded.role === 'ADMIN' ||
    decoded.role === 'admin' ||
    decoded.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase();

  res.json({
    authenticated: true,
    user: {
      ...decoded,
      isAdmin,
      role: isAdmin ? 'ADMIN' : (decoded.role || 'user'),
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
