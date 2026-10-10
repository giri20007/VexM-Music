const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 60, // 60 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: true,
    code: 'TOO_MANY_ATTEMPTS',
    message: 'Too many login attempts. Please try again after a few minutes.',
  },
});

const adminApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 120, // 120 admin operations per min
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  adminApiLimiter,
};
