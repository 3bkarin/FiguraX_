import express from 'express';
import { loginRateLimit } from '../middleware/rate-limit.middleware.js';
import { validateRequest } from '../middleware/index.js';
import { loginValidator } from '../validators/index.js';
import { authenticateUser } from '../services/auth.service.js';
import { createSession, deleteSession, getSession as getSessionData } from '../services/session.service.js';

const router = express.Router();

router.post('/login', loginRateLimit, loginValidator, validateRequest, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await authenticateUser(username, password);

    if (!result.success) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: result.message } });
    }

    const sessionId = await createSession(result.user);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      success: true,
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const sessionId = req.cookies?.session_id;
    if (sessionId) {
      await deleteSession(sessionId);
    }
    res.clearCookie('session_id', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      return res.json({ success: true, data: { user: null, authenticated: false } });
    }

    const session = await getSessionData(sessionId);
    if (!session?.user) {
      res.clearCookie('session_id', { path: '/' });
      return res.json({ success: true, data: { user: null, authenticated: false } });
    }

    res.json({ success: true, data: { user: session.user, authenticated: true } });
  } catch (error) {
    next(error);
  }
});

export default router;