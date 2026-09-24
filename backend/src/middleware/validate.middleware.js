import { validationResult } from 'express-validator';
import { ValidationError } from './error.middleware.js';

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => `${e.path}: ${e.msg}`).join('; ');
    throw new ValidationError(messages);
  }
  next();
}

export function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
}