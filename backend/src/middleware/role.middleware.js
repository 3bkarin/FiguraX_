import { isFinanceAdmin, hasPermission } from '../services/auth.service.js';

export function requireFinanceAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  if (!isFinanceAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Finance admin permissions required' },
    });
  }

  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Permission '${permission}' required` },
      });
    }

    next();
  };
}