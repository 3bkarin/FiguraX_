# FIGURAX Store

A complete full-stack e-commerce platform for 3D printed figures and collectibles, built with modern web technologies.

## Architecture

```
GitHub Pages (Frontend) → Railway (Backend API) → Google Sheets / Drive / Gmail
```

## Features

### Customer Storefront
- **Home Page**: Hero section, categories, featured products, reviews, social links
- **Products Page**: Grid view with search, category filter, responsive design
- **Product Details**: Image gallery, specifications, quantity selector, add to cart
- **Shopping Cart**: Persistent localStorage cart, quantity controls, remove items
- **Checkout**: Customer info, governorate-based shipping, InstaPay/Cash on Delivery, order confirmation

### Admin Dashboard
- **Financial Dashboard**: Revenue, costs, profit, funding, per-member profit, charts
- **Categories**: CRUD with product counts
- **Products**: Full CRUD with images, dimensions, materials, manufacturing cost
- **Orders**: View, filter, update status, shipping, payment tracking
- **Fund Management**: Capital funding & raw material expenses, team summaries
- **Analytics**: Best sellers, top customers, order statistics
- **Settings**: Social links, InstaPay, company info
- **Reviews**: Customer testimonials with images

### Technical Features
- **Bilingual**: Arabic (RTL) / English (LTR) with localStorage persistence
- **Secure Auth**: Argon2id password hashing, HTTP-only cookies, role-based permissions
- **Google Integration**: Sheets (database), Drive (file storage), Gmail (emails)
- **Idempotency**: Duplicate order protection
- **Responsive**: Mobile-first design, works on all screen sizes
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation

## Quick Start

### Prerequisites
- Node.js 18+
- Google Cloud Project with APIs enabled
- Google Service Account with Sheets/Drive access
- Gmail OAuth2 credentials
- Railway account (for backend)
- GitHub account (for frontend)

### 1. Clone & Install

```bash
git clone <repository>
cd FIGURAX

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials

# Frontend
cd ../frontend
# No build step needed - static files
```

### 2. Google Cloud Setup

Enable APIs:
- Google Sheets API
- Google Drive API
- Gmail API

Create Service Account:
1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create service account, download JSON key
3. Share target Google Sheet with service account email (Editor)
4. Share target Drive folder with service account email (Editor)

Gmail OAuth2:
1. Create OAuth 2.0 Client ID (Web application)
2. Authorized redirect URI: `https://developers.google.com/oauthplayground`
3. Get refresh token via OAuth Playground

### 3. Environment Variables

```env
# Backend .env
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5500
PRODUCTION_FRONTEND_ORIGIN=https://your-username.github.io/figurax

SESSION_SECRET=your-32-char-secret

GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

GOOGLE_SHEET_ID=1ssCowPsU-GYSTBrFD093l5eNUvPp5851JuZY7eDLkvA
GOOGLE_DRIVE_FOLDER_ID=1z1vjxMcmQ2n3ZH32mgi11jTHfOYG6WLm

GMAIL_CLIENT_ID=your-oauth-client-id
GMAIL_CLIENT_SECRET=your-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-oauth-refresh-token
GMAIL_SENDER=figuraxverse@gmail.com

COMPANY_EMAIL=figuraxverse@gmail.com
DEFAULT_CURRENCY=EGP

ADMIN_MAHROUS_EMAIL=abdelrahman.mahrous2005@gmail.com
ADMIN_MAHROUS_ID=147897
```

### 4. Initialize Database

```bash
cd backend
npm run init:sheets
npm run migrate:passwords
npm run migrate:data
```

### 5. Run Locally

Backend:
```bash
cd backend
npm run dev
# Runs on http://localhost:3000
```

Frontend (using any static server):
```bash
cd frontend
npx serve .
# Or VS Code Live Server on port 5500
```

### 6. Deploy

**Backend (Railway):**
1. Connect GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy - Railway auto-detects Node.js

**Frontend (GitHub Pages):**
1. Push `frontend/` folder to GitHub repo
2. Enable GitHub Pages in repo settings
3. Set custom domain if needed
4. Update `PRODUCTION_FRONTEND_ORIGIN` in backend env

## Project Structure

```
FIGURAX/
├── frontend/                 # GitHub Pages static site
│   ├── index.html           # Home page
│   ├── products.html        # Product listing
│   ├── product.html         # Product detail
│   ├── cart.html            # Shopping cart
│   ├── checkout.html        # Checkout form
│   ├── admin.html           # Admin dashboard
│   ├── 404.html             # Not found page
│   ├── assets/
│   │   ├── css/             # Stylesheets
│   │   ├── js/              # JavaScript modules
│   │   └── locales/         # Translation files
│   └── locales/
│       ├── ar.json          # Arabic translations
│       └── en.json          # English translations
│
├── backend/                  # Railway Node.js API
│   ├── server.js            # Express entry point
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── config/          # Environment, Google APIs
│   │   ├── routes/          # API route handlers
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, validation, errors
│   │   ├── validators/      # Input validation
│   │   └── utils/           # Helpers
│   ├── scripts/             # Setup & migration
│   └── tests/               # Jest tests
│
└── docs/                    # Documentation
    ├── GOOGLE_SETUP.md
    ├── DEPLOYMENT.md
    ├── SHEETS_SCHEMA.md
    └── SECURITY.md
```

## Google Sheets Schema

### Core Sheets
- **Users**: ID, Username, PasswordHash, Email, Role, Permissions, Active
- **Categories**: ID, Name, Description, ProductCount, Active
- **Products**: ID, CategoryID, CategoryName, Name, Description, Dimensions, Weight, InfillPercent, Material, ManufacturingCost, SellingPrice, ImageURL, GalleryURLs, Active
- **Pending_Orders**: OrderID, Date, CustomerName, CustomerEmail, Gender, Phone, Governorate, DetailedAddress, LocationURL, Platform, PaymentMethod, Notes, Subtotal, ShippingFee, TotalPrice, Status, RegisteredBy
- **Order_Items**: OrderID, ProductID, ProductNameSnapshot, Quantity, UnitPriceSnapshot, ManufacturingCostSnapshot, LineTotal
- **Accepted_Orders**: Full order financial snapshot for delivered orders
- **Fund**: ID, Date, Name, Type, Amount, Details, PaymentMethod, ImageURL, AddedBy
- **Activity_Logs**: DateTime, Admin, Action, Details, AttachmentURL, EmailStatus
- **Returns**: OrderID, Date, CustomerName, Products, ReturnReason, RecordedBy
- **Reviews**: ID, Date, CustomerName, Rating, ContentType, Content, AddedBy, Approved

### Configuration Sheets
- **Shipping_Rates**: Governorate, ShippingFee, Active
- **Settings**: Key, Value, Description (brand_name, whatsapp, instagram, facebook, tiktok, instapay_username, instapay_link, company_email, currency, team_size)
- **Idempotency**: Key, Response, CreatedAt, ExpiresAt

## API Endpoints

### Public
```
GET  /api/health
GET  /api/public/settings
GET  /api/public/categories
GET  /api/public/products
GET  /api/public/products/:id
GET  /api/public/shipping?governorate=...
GET  /api/public/reviews
POST /api/orders (with Idempotency-Key header)
```

### Auth
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Admin (requires authentication)
```
GET  /api/admin/dashboard
GET  /api/admin/categories
POST /api/admin/categories
PATCH /api/admin/categories/:id
GET  /api/admin/products
POST /api/admin/products
PATCH /api/admin/products/:id
DELETE /api/admin/products/:id
GET  /api/admin/orders
GET  /api/admin/orders/:id
PATCH /api/admin/orders/:id/status
GET  /api/admin/fund
POST /api/admin/fund
PATCH /api/admin/fund/:id (finance admin only)
GET  /api/admin/analysis
GET  /api/admin/reviews
POST /api/admin/reviews
GET  /api/admin/settings
PATCH /api/admin/settings
GET  /api/admin/shipping
PATCH /api/admin/shipping/:governorate
GET  /api/admin/activity-logs
```

## Security

- Passwords hashed with Argon2id (never plaintext)
- HTTP-only, Secure, SameSite=Lax cookies
- Server-side authorization for all admin endpoints
- CORS restricted to known origins
- Rate limiting on auth and order endpoints
- Input validation with express-validator
- No secrets in frontend or repository
- Google credentials via environment variables only

## Team Permissions

| Admin | Dashboard | Categories | Products | Orders | Fund (View) | Fund (Edit) | Analytics | Settings | Reviews |
|-------|-----------|------------|----------|--------|-------------|-------------|-----------|----------|---------|
| All   | ✅        | ✅         | ✅       | ✅     | ✅          | ❌          | ✅        | ✅       | ✅      |
| Mahrous | ✅      | ✅         | ✅       | ✅     | ✅          | ✅          | ✅        | ✅       | ✅      |

## Business Rules

- **Revenue**: Only Delivered orders
- **Manufacturing Cost**: Product cost × quantity (from external 3D printing provider)
- **Shipping**: From final order shipping value
- **Raw Materials**: Separate Fund transactions (مصروف خامات)
- **Net Profit**: Revenue - Manufacturing - Shipping - Raw Materials
- **Funding**: Separate metric (Net Profit + Funding)
- **Profit Per Member**: Net Profit / Active Team Members

## Email Notifications

1. **Order Confirmation**: Sent to customer email on successful order
2. **Financial Transaction**: Sent to responsible team member when admin adds fund transaction

Sender: `figuraxverse@gmail.com`

## Testing

```bash
cd backend
npm test
```

## Scripts

```bash
npm run init:sheets        # Initialize Google Sheets structure
npm run migrate:passwords  # Hash plaintext passwords
npm run migrate:data       # Migrate existing data
npm run dev                # Development server with auto-reload
npm start                  # Production server
npm test                   # Run Jest tests
```

## Troubleshooting

**Google Sheets 403**: Check service account has Editor access to Sheet
**Drive 403**: Check service account has Editor access to Drive folder
**Gmail 401**: Refresh token expired - regenerate via OAuth Playground
**CORS Error**: Check FRONTEND_ORIGIN matches deployed frontend URL
**Session Lost**: Check SESSION_SECRET is set and consistent

## License

Proprietary - FIGURAX Store