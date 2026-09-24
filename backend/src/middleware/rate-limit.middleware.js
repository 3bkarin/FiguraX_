import rateLimit from 'express-rate-limit';

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts, please try again later' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const orderRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many order attempts, please wait' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many uploads, please wait' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});