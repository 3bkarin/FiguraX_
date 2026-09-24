import { getSession } from '../services/session.service.js';

export async function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session_id;

  if (!sessionId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const session = await getSession(sessionId);
  if (!session?.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Session expired or invalid' },
    });
  }

  req.user = session.user;
  req.sessionId = sessionId;
  next();
}

export async function attachUser(req, res, next) {
  const sessionId = req.cookies?.session_id;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session?.user) {
      req.user = session.user;
      req.isAuthenticated = true;
    }
  }

  next();
}

export function optionalAuth(req, res, next) {
  attachUser(req, res, next);
}