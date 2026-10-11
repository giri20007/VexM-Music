require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const prod = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Cookie'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Set-Cookie'],
}));

// Global API rate limit
app.use(['/api', '/'], rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
}));

const { seedOwnerAndMigrate } = require('./services/userService');

let seeded = false;
app.use(async (_req, _res, next) => {
  if (!seeded) {
    seeded = true;
    seedOwnerAndMigrate().catch(err => console.error('[DATABASE INIT ERROR]', err.message));
  }
  next();
});

// Health check
app.get(['/api/health', '/health'], (_req, res) => res.json({
  status: 'ok',
  service: 'VexM Audio Player',
  version: '2.0.0',
  timestamp: new Date().toISOString(),
}));

// API Routes
app.use(['/api/auth', '/auth'], require('./routes/auth'));
app.use(['/api/library', '/library'], require('./routes/library').router);
app.use(['/api/metadata', '/metadata'], require('./routes/metadata'));
app.use(['/api/stream', '/stream'], require('./routes/stream'));
app.use(['/api/lyrics', '/lyrics'], require('./routes/lyrics'));
app.use(['/api/artwork', '/artwork'], require('./routes/artwork'));
app.use(['/api/admin', '/admin'], require('./routes/admin'));
app.use(['/api/yt', '/yt'], require('./routes/youtube'));
app.use(['/api/saavn', '/saavn'], require('./routes/saavn'));

// 404 for unmatched API routes
app.use(['/api', '/auth', '/library', '/stream', '/lyrics', '/artwork', '/admin', '/yt', '/saavn'], (_req, res) => {
  res.status(404).json({
    error: true,
    code: 'NOT_FOUND',
    message: 'API route not found',
  });
});

// Error handler
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

module.exports = app;
