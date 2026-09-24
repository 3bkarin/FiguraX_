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

import {
errorHandler,
notFoundHandler,
} from './src/middleware/error.middleware.js';

import { sanitizeInput } from './src/middleware/validate.middleware.js';
import { apiRateLimit } from './src/middleware/rate-limit.middleware.js';

import publicRoutes from './src/routes/public.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import adminRoutes from './src/routes/admin.routes.js';

/**

* =========================================================
* TRUSTED ORIGINS
* =========================================================
*
* Production frontend:
* https://3bkarin.github.io
*
* Local development:
* http://127.0.0.1:8080
* http://192.168.1.3:8080
  */
  const allowedOrigins = [
  'https://3bkarin.github.io',
  'http://127.0.0.1:8080',
  'http://192.168.1.3:8080',
  ];

/**

* =========================================================
* CSRF / TRUSTED ORIGIN CHECK
* =========================================================
*
* Only state-changing requests are checked.
* GET / HEAD / OPTIONS are allowed to continue.
  */
  function enforceTrustedOrigin(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
  return next();
  }

const origin = req.get('origin');

// Allow trusted origins
if (origin && allowedOrigins.includes(origin)) {
return next();
}

// In development, allow requests without an Origin header
if (!origin && env.nodeEnv !== 'production') {
return next();
}

return res.status(403).json({
success: false,
error: {
code: 'CSRF_ORIGIN_REJECTED',
message: 'Untrusted request origin',
},
});
}

/**

* =========================================================
* EXPRESS APP
* =========================================================
  */
  const app = express();

/**

* =========================================================
* SECURITY HEADERS
* =========================================================
  */
  app.use(
  helmet({
  crossOriginResourcePolicy: {
  policy: 'cross-origin',
  },
  })
  );

/**

* =========================================================
* CORS
* =========================================================
*
* IMPORTANT:
* GitHub Pages origin is:
* https://3bkarin.github.io
*
* Do NOT include /FiguraX_ here.
  */
  app.use(
  cors({
  origin: (origin, callback) => {
  // Requests without an Origin header
  // (curl, server-to-server requests, etc.)
  if (!origin) {
  return callback(null, true);
  }

  if (allowedOrigins.includes(origin)) {
  return callback(null, true);
  }

  return callback(
  new Error(`CORS blocked origin: ${origin}`)
  );
  },

  credentials: true,

  methods: [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  ],

  allowedHeaders: [
  'Content-Type',
  'Authorization',
  'Idempotency-Key',
  ],

  optionsSuccessStatus: 204,
  })
  );

/**

* =========================================================
* EXPLICIT PREFLIGHT HANDLER
* =========================================================
*
* This makes sure browser OPTIONS requests from
* GitHub Pages receive the required CORS headers.
  */
  app.options(
  '*',
  cors({
  origin: 'https://3bkarin.github.io',

  credentials: true,

  methods: [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  ],

  allowedHeaders: [
  'Content-Type',
  'Authorization',
  'Idempotency-Key',
  ],

  optionsSuccessStatus: 204,
  })
  );

/**

* =========================================================
* BODY PARSERS
* =========================================================
  */
  app.use(
  express.json({
  limit: '10mb',
  })
  );

app.use(
express.urlencoded({
extended: true,
limit: '10mb',
})
);

app.use(cookieParser());

/**

* =========================================================
* REQUEST SECURITY MIDDLEWARE
* =========================================================
  */
  app.use(enforceTrustedOrigin);
  app.use(sanitizeInput);

/**

* =========================================================
* RATE LIMITING
* =========================================================
  */
  if (env.nodeEnv === 'production') {
  app.use(apiRateLimit);
  }

/**

* =========================================================
* API ROUTES
* =========================================================
  */
  app.use('/api', publicRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/admin', adminRoutes);

/**

* =========================================================
* ERROR HANDLERS
* =========================================================
  */
  app.use(notFoundHandler);

app.use(errorHandler);

/**

* =========================================================
* STARTUP
* =========================================================
  */
  export async function startup() {
  try {
  validateEnv();

  /**

  * ---
  * Google APIs
  * ---

  */
  console.log('🔌 Connecting to Google APIs...');

  const googleOk = await testGoogleConnections();

  if (!googleOk) {
  console.warn(
  '⚠️ Some Google API connections failed - check credentials'
  );
  }

  /**

  * ---
  * Google Sheets
  * ---

  */
  console.log('📊 Initializing Google Sheets...');

  await initializeSheets();

  /**

  * ---
  * Google Drive
  * ---

  */
  console.log('📁 Initializing Drive folders...');

  await initializeDriveFolders();

  /**

  * ---
  * Settings
  * ---

  */
  console.log('⚙️ Initializing settings...');

  await initializeSettings();

  /**

  * ---
  * Shipping Rates
  * ---

  */
  console.log('🚚 Initializing shipping rates...');

  await initializeDefaultShippingRates();

  /**

  * ---
  * Password Migration
  * ---

  */
  console.log('🔐 Migrating passwords...');

  const { migrated } = await migratePlaintextPasswords();

  if (migrated > 0) {
  console.log(
  `✅ Migrated ${migrated} plaintext passwords to hashed`
  );
  }

  /**

  * ---
  * Start HTTP Server
  * ---

  */
  app.listen(env.port, () => {
  console.log(
  `🚀 FIGURAX Backend running on port ${env.port}`
  );

  console.log(
  `🌍 Environment: ${env.nodeEnv}`
  );

  console.log('🔗 Allowed CORS origins:');

  allowedOrigins.forEach((origin) => {
  console.log(`   - ${origin}`);
  });
  });

} catch (error) {
console.error(
'❌ Startup failed:',
error.message
);

```
process.exit(1);
```

}
}

/**

* =========================================================
* RUN SERVER
* =========================================================
  */
  if (process.env.RUN_SERVER !== 'false') {
  startup();
  }

export default app;
