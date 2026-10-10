require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

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

// Public Health Endpoint
app.get(['/api/health', '/health'], (_req, res) => res.json({
  status: 'ok',
  service: 'SPiDEYxFLASH Audio Player',
  version: '2.0.0',
  timestamp: new Date().toISOString(),
}));

// Route Handlers
app.use(['/api/auth', '/auth'], require('./routes/auth'));
app.use(['/api/library', '/library'], require('./routes/library').router);
app.use(['/api/metadata', '/metadata'], require('./routes/metadata'));
app.use(['/api/stream', '/stream'], require('./routes/stream'));
app.use(['/api/lyrics', '/lyrics'], require('./routes/lyrics'));
app.use(['/api/artwork', '/artwork'], require('./routes/artwork'));
app.use(['/api/admin', '/admin'], require('./routes/admin'));

// 404 for unmatched API routes
app.use(['/api', '/'], (_req, res, next) => {
  if (_req.path.startsWith('/api') || _req.path.startsWith('/auth') || _req.path.startsWith('/library')) {
    return res.status(404).json({
      error: true,
      code: 'NOT_FOUND',
      message: 'API route not found',
    });
  }
  next();
});

// Serve frontend static files if built locally
const frontendDist = path.join(__dirname, '../../dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

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

if (!process.env.VERCEL) {
  const port = process.env.PORT || 8000;
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
