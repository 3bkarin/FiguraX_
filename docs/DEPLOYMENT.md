# Deployment Guide

## Backend Deployment (Railway)

### 1. Prepare Repository

Ensure your repository has:
- `backend/` folder with all source code
- `backend/package.json` with start script
- `.gitignore` excluding `.env` and `node_modules`

### 2. Create Railway Project

1. Go to [Railway](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Set **Root Directory** to `backend`
5. Railway auto-detects Node.js

### 3. Configure Environment Variables

In Railway dashboard → Variables, add:

```env
NODE_ENV=production
PORT=3000
PRODUCTION_FRONTEND_ORIGIN=https://your-username.github.io/figurax

SESSION_SECRET=your-32-char-production-secret

GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1ssCowPsU-GYSTBrFD093l5eNUvPp5851JuZY7eDLkvA
GOOGLE_DRIVE_FOLDER_ID=1z1vjxMcmQ2n3ZH32mgi11jTHfOYG6WLm

GMAIL_CLIENT_ID=your-oauth-client-id
GMAIL_CLIENT_SECRET=your-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_SENDER=figuraxverse@gmail.com

COMPANY_EMAIL=figuraxverse@gmail.com
DEFAULT_CURRENCY=EGP

ADMIN_MAHROUS_EMAIL=abdelrahman.mahrous2005@gmail.com
ADMIN_MAHROUS_ID=147897
```

### 4. Deploy

Railway auto-deploys on push to main branch. Monitor logs for:
```
🚀 FIGURAX Backend running on port 3000
🌍 Environment: production
🔗 CORS origin: https://your-username.github.io/figurax
```

### 5. Verify Deployment

Visit your Railway URL (e.g., `https://figurax-backend.railway.app`):
- `GET /api/health` → `{ "success": true, "data": { "status": "ok" } }`
- Check Railway logs for Google API connections

## Frontend Deployment (GitHub Pages)

### 1. Repository Structure

Option A: Frontend in root
```
repo/
├── index.html
├── products.html
├── ...
├── assets/
└── ...
```

Option B: Frontend in subfolder (recommended for monorepo)
```
repo/
├── frontend/
│   ├── index.html
│   ├── ...
│   └── assets/
├── backend/
└── ...
```

### 2. Configure API Base URL

Edit `frontend/assets/js/config.js`:

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : 'https://your-railway-app.railway.app/api';
```

### 3. Enable GitHub Pages

1. Go to repository **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `root` (or `/frontend` if using subfolder)
4. Save

### 4. Custom Domain (Optional)

1. Add `CNAME` file to frontend root:
   ```
   store.figurax.com
   ```
2. In Pages settings, enter custom domain
3. Enable **Enforce HTTPS**

### 5. Verify Deployment

Visit your GitHub Pages URL:
- `https://your-username.github.io/figurax/` (root)
- `https://your-username.github.io/figurax/frontend/` (subfolder)

Check:
- Home page loads
- Language switch works
- Products load from API
- Cart persists
- Checkout works

## Production Checklist

### Security
- [ ] Strong `SESSION_SECRET` (32+ chars)
- [ ] `PRODUCTION_FRONTEND_ORIGIN` matches exactly
- [ ] No `.env` committed to Git
- [ ] Google credentials only in Railway variables
- [ ] HTTPS enforced on both frontend and backend

### CORS
- [ ] Backend allows only production frontend origin
- [ ] Credentials: true for cookies
- [ ] No wildcard `*` in production

### Google APIs
- [ ] Service account has Editor on Sheet
- [ ] Service account has Editor on Drive folder
- [ ] Gmail OAuth2 refresh token valid
- [ ] APIs enabled in Cloud Console

### Functionality
- [ ] Admin login works
- [ ] Dashboard loads metrics
- [ ] Products CRUD works
- [ ] Orders flow works
- [ ] Customer emails sent
- [ ] Financial emails sent
- [ ] Image uploads work
- [ ] Language switch persists

## Monitoring

### Railway Logs
- Application logs
- Error tracking
- Deploy history
- Metrics (CPU, Memory, Network)

### Health Checks
- `GET /api/health` every 5 min
- Alert on 5xx errors

### Google Quotas
- Sheets API: 300 requests/minute
- Drive API: 1000 requests/100 seconds
- Gmail API: 250 quota units/user/second

## Rollback

### Railway
- Dashboard → Deployments → Click **Redeploy** on previous version

### GitHub Pages
- Revert commit → Auto-deploys
- Or: Settings → Pages → Change branch

## Scaling

### Railway
- Auto-scales based on traffic
- Configure max replicas in settings
- Consider Redis for sessions if multi-instance

### Database (Google Sheets)
- Not horizontally scalable
- Consider migration to PostgreSQL for high traffic
- Current: Suitable for < 1000 orders/day

## Backup Strategy

### Google Sheets
- Version history (auto)
- Manual export: File → Download → CSV
- Apps Script backup to another Sheet

### Drive Files
- Version history per file
- Manual download of critical folders

### Configuration
- All config in Git (except secrets)
- Railway variables backed up in dashboard