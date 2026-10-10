require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const prod = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map(s => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (!prod && (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin))) {
      return cb(null, true);
    }
    // In production, if allowedOrigins is empty or has wildcard/vercel preview:
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    cb(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Cookie'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Set-Cookie'],
}));

// Global API rate limit
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2500,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Public Endpoints
app.get('/', (_req, res) => res.json({
  status: 'ok',
  service: 'SPiDEYxFLASH Audio Player API',
  version: '2.0.0',
  health: '/api/health',
}));

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  service: 'SPiDEYxFLASH Audio Player',
  version: '2.0.0',
  timestamp: new Date().toISOString(),
}));

// Route Handlers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/library', require('./routes/library').router);
app.use('/api/metadata', require('./routes/metadata'));
app.use('/api/stream', require('./routes/stream'));
app.use('/api/lyrics', require('./routes/lyrics'));
app.use('/api/artwork', require('./routes/artwork'));
app.use('/api/admin', require('./routes/admin'));

// 404 for unmatched API routes
app.use('/api', (_req, res) => res.status(404).json({
  error: true,
  code: 'NOT_FOUND',
  message: 'API route not found',
}));

// Global Error Handler
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('API error:', err.message || err);
  }
  if (!res.headersSent) {
    res.status(status).json({
      error: true,
      code: err.code || (status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR'),
      message: err.status ? err.message : (prod ? 'Server error occurred' : err.message),
      retryAfter: err.retryAfter,
    });
  }
});

const { seedOwnerAndMigrate } = require('./services/userService');

let seeded = false;
app.use(async (_req, _res, next) => {
  if (!seeded) {
    seeded = true;
    seedOwnerAndMigrate().catch(err => console.error('[DATABASE INIT ERROR]', err.message));
  }
  next();
});

if (!process.env.VERCEL) {
  const port = process.env.PORT || 10000;
  app.listen(port, async () => {
    console.log(`[SPiDEYxFLASH] API running on http://localhost:${port}`);
    try {
      await seedOwnerAndMigrate();
    } catch (err) {
      console.error('[DATABASE INIT ERROR]', err.message);
    }
  });
}

module.exports = app;
