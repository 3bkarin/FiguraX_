export function errorHandler(err, req, res, next) {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }

  if (err.message?.includes('Google API') || err.message?.includes('sheets') || err.message?.includes('drive')) {
    return res.status(502).json({
      success: false,
      error: { code: 'UPSTREAM_ERROR', message: 'External service temporarily unavailable' },
    });
  }

  const status = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(status).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}