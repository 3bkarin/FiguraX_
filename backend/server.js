import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, validateEnv } from './src/config/env.js';
import { testGoogleConnections } from './src/config/google.js';
import { initializeDriveFolders } from './src/services/drive.service.js';
import { initializeSheets } from './src/services/sheets.service.js';
import { initializeSettings } from './src/services/settings.service.js';
import { initializeDefaultShippingRates } from './src/services/shipping.service.js';
import { migratePlaintextPasswords } from './src/services/auth.service.js';
import { errorHandler, notFoundHandler } from './src/middleware/error.middleware.js';
import { sanitizeInput } from './src/middleware/validate.middleware.js';
import { apiRateLimit } from './src/middleware/rate-limit.middleware.js';

function enforceTrustedOrigin(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  const origin = req.get('origin');

  const allowed = [
    env.frontendOrigin,
    env.productionFrontendOrigin,
    'http://127.0.0.1:8080',
    'http://192.168.1.3:8080'
  ].filter(Boolean);

  if (origin && allowed.includes(origin)) return next();

  if (!origin && env.nodeEnv !== 'production') return next();

  return res.status(403).json({
    success: false,
    error: {
      code: 'CSRF_ORIGIN_REJECTED',
      message: 'Untrusted request origin'
    }
  });
}

import publicRoutes from './src/routes/public.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import adminRoutes from './src/routes/admin.routes.js';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: env.nodeEnv === 'production'
    ? env.productionFrontendOrigin
    : [
        'http://127.0.0.1:8080',
        'http://192.168.1.3:8080'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(enforceTrustedOrigin);
app.use(sanitizeInput);

if (env.nodeEnv === 'production') {
  app.use(apiRateLimit);
}

app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export async function startup() {
  try {
    validateEnv();

    console.log('🔌 Connecting to Google APIs...');
    const googleOk = await testGoogleConnections();

    if (!googleOk) {
      console.warn('⚠️  Some Google API connections failed - check credentials');
    }

    console.log('📊 Initializing Google Sheets...');
    await initializeSheets();

    console.log('📁 Initializing Drive folders...');
    await initializeDriveFolders();

    console.log('⚙️  Initializing settings...');
    await initializeSettings();

    console.log('🚚 Initializing shipping rates...');
    await initializeDefaultShippingRates();

    console.log('🔐 Migrating passwords...');
    const { migrated } = await migratePlaintextPasswords();

    if (migrated > 0) {
      console.log(`✅ Migrated ${migrated} plaintext passwords to hashed`);
    }

    app.listen(env.port, () => {
      console.log(`🚀 FIGURAX Backend running on port ${env.port}`);
      console.log(`🌍 Environment: ${env.nodeEnv}`);

      if (env.nodeEnv === 'production') {
        console.log(`🔗 CORS origin: ${env.productionFrontendOrigin}`);
      } else {
        console.log('🔗 CORS origins:');
        console.log('   - http://127.0.0.1:8080');
        console.log('   - http://192.168.1.3:8080');
      }
    });

  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

if (process.env.RUN_SERVER !== 'false') {
  startup();
}

export default app;