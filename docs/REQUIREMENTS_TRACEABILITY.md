# Requirements Traceability Matrix

This document maps major requirements from `FIGURAX_FINAL_PROJECT_SPEC.md` to implementation files, API endpoints, and tests.

---

## 1. Architecture & Infrastructure

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| GitHub Pages frontend + Railway backend + Google APIs | `backend/server.js`, `frontend/assets/js/config.js` | N/A | N/A |
| REST API with `/api` prefix | `backend/src/routes/*.js` | All endpoints under `/api` | N/A |
| Environment variables for all secrets | `backend/.env.example`, `backend/src/config/env.js` | N/A | N/A |
| No `google.script.run` in production | Verified - none found in backend/frontend | N/A | N/A |
| HTTPS in production | Railway/Heroku auto-HTTPS, GitHub Pages HTTPS | N/A | N/A |

---

## 2. Google Sheets Integration (Source of Truth)

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Sheets as operational data store | `backend/src/services/sheets.service.js` | All admin/public endpoints | N/A |
| Read Users, Categories, Products, Orders, Fund, etc. | `sheets.service.js` methods | `GET /api/public/*`, `GET /api/admin/*` | N/A |
| Write operations (append, update, delete) | `sheets.service.js` methods | `POST/PATCH/DELETE /api/admin/*` | N/A |
| Direct Sheet edits reflected in app | Cache invalidation in `sheets.service.js` | N/A | Manual test |
| Backward compatibility with existing sheets | `constants.js` SHEET_NAMES & SHEET_HEADERS | N/A | N/A |
| New sheets: Order_Items, Shipping_Rates, Settings, Idempotency | `constants.js`, `initialize-google-sheet.js` | N/A | N/A |

---

## 3. Google Drive Integration

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Product images upload | `drive.service.js`, `product.service.js` | `POST /api/admin/products/upload-image` | N/A |
| Payment proofs upload | `drive.service.js`, `order.service.js` | `PATCH /api/admin/orders/:id/status` | N/A |
| Fund transaction images | `drive.service.js`, `fund.service.js` | `POST /api/admin/fund` | N/A |
| Review images | `drive.service.js`, `review.service.js` | `POST /api/admin/reviews` | N/A |
| Subfolders: Products, Payment_Proofs, Fund_Transactions, Reviews | `constants.js` DRIVE_FOLDERS | N/A | N/A |
| Private files not publicly exposed | `drive.service.js` permissions logic | N/A | Manual test |

---

## 4. Gmail Integration

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Sender: figuraxverse@gmail.com | `gmail.service.js`, `env.js` | N/A | N/A |
| Customer order confirmation email | `gmail.service.js`, `email/templates.js`, `order.service.js` | Triggered by `POST /api/orders` | Manual test |
| Financial transaction notification | `gmail.service.js`, `email/templates.js`, `fund.service.js` | Triggered by `POST /api/admin/fund` | Manual test |
| Only 2 automatic email events | Verified in code - only these two | N/A | Code review |
| Email design follows FIGURAX reference | `email/templates.js` | N/A | Visual test |
| OAuth2 for Gmail API | `gmail.service.js`, `google.js` | N/A | N/A |

---

## 5. Customer Website (Frontend)

### 5.1 Pages

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| index.html (Home) | `frontend/index.html`, `assets/js/index.js` | `GET /api/public/categories`, `GET /api/public/products`, `GET /api/public/reviews`, `GET /api/public/settings` | Manual |
| products.html | `frontend/products.html`, `assets/js/products.js` | `GET /api/public/products`, `GET /api/public/categories` | Manual |
| product.html | `frontend/product.html`, `assets/js/product.js` | `GET /api/public/products/:id` | Manual |
| cart.html | `frontend/cart.html`, `assets/js/cart-page.js` | LocalStorage only | Manual |
| checkout.html | `frontend/checkout.html`, `assets/js/checkout.js` | `GET /api/public/shipping`, `POST /api/orders` | Manual |
| admin.html | `frontend/admin.html`, `assets/js/admin.js` | All `/api/admin/*` | Manual |
| 404.html | `frontend/404.html` | N/A | Manual |

### 5.2 Features

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Header with cart, logo, language switch, menu | `index.html`, `customer.css`, `common.js` | N/A | Manual |
| Categories loaded from Sheets | `index.js`, `products.js` | `GET /api/public/categories` | Manual |
| Product cards with image, name, price, Add to Cart | `products.js`, `index.js` | `GET /api/public/products` | Manual |
| Product detail: gallery, specs, quantity, Add to Cart | `product.js` | `GET /api/public/products/:id` | Manual |
| Cart: localStorage persistence, quantity controls | `cart.js`, `cart-page.js` | N/A | Manual |
| Checkout: all required fields, validation | `checkout.js`, `checkout.html` | `GET /api/public/shipping`, `POST /api/orders` | Manual |
| Shipping by governorate from Sheets | `checkout.js`, `shipping.service.js` | `GET /api/public/shipping?governorate=...` | Manual |
| Server-side price calculation | `order.service.js`, `money.js` | `POST /api/orders` | Unit test |
| Idempotency key for duplicate protection | `public.routes.js`, `idempotency.service.js` | `POST /api/orders` header | Unit test |
| Customer confirmation email | `gmail.service.js`, `order.service.js` | Triggered by `POST /api/orders` | Manual |

---

## 6. Internationalization (Arabic/English)

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| RTL for Arabic, LTR for English | `i18n.js`, `base.css`, `responsive.css` | N/A | Manual |
| Language switch persists in localStorage | `i18n.js` | N/A | Manual |
| `<html lang="">` and `dir=""` updated | `i18n.js` | N/A | Manual |
| All strings from translation files | `locales/ar.json`, `locales/en.json` | N/A | Manual |
| No hardcoded Arabic-only strings in JS | Verified - all use `t()` function | N/A | Code review |

---

## 7. Admin Dashboard

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Dark dashboard visual language | `admin.css`, `admin.html` | N/A | Visual |
| Sections: Dashboard, Categories, Products, Orders, Fund, Analysis, Settings, Reviews | `admin.js`, `admin.html` | All `/api/admin/*` | Manual |
| Login with username/password | `admin.js`, `auth.routes.js` | `POST /api/auth/login` | Manual |
| Session: HTTP-only cookie, Secure, SameSite=None in production; Lax in development | `auth.routes.js`, `session.service.js` | `POST /api/auth/login` | Security test |
| Role-based permissions (Admin vs Finance Admin) | `auth.service.js`, `role.middleware.js` | All `/api/admin/*` | Security test |
| Mahrous-only finance edit | `fund.service.js`, `role.middleware.js` | `PATCH /api/admin/fund/:id` | Security test |

---

## 8. Authentication & Authorization

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Argon2id password hashing | `auth.service.js` | `POST /api/auth/login` | Unit test |
| Password migration script | `migrate-passwords.js` | `npm run migrate:passwords` | Manual |
| Server-side session validation | `session.service.js`, `auth.middleware.js` | All `/api/admin/*` | Security test |
| Login rate limiting | `rate-limit.middleware.js` | `POST /api/auth/login` | Security test |
| Order rate limiting | `rate-limit.middleware.js` | `POST /api/orders` | Security test |
| CORS restricted to known origins | `server.js` | All | Security test |
| No secrets in frontend | Verified - none found | N/A | Code review |

---

## 9. Products & Categories

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Category CRUD | `product.service.js`, `admin.routes.js` | `GET/POST/PATCH /api/admin/categories` | Manual |
| Product CRUD with images | `product.service.js`, `admin.routes.js` | `GET/POST/PATCH/DELETE /api/admin/products` | Manual |
| Fields: category, name, description, dimensions, weight, infill, material, manufacturing cost, selling price | `constants.js` SHEET_HEADERS | N/A | Manual |
| Manufacturing cost = external 3D printing provider cost | Business logic in `order.service.js` | N/A | Manual |
| Material field (PLA, PETG, Resin) | `constants.js`, `product.service.js` | N/A | Manual |
| Product images in Drive | `drive.service.js`, `product.service.js` | `POST /api/admin/products/upload-image` | Manual |
| Active/inactive status | `product.service.js` | `PATCH /api/admin/products/:id` | Manual |
| Category filter on customer site | `products.js` | `GET /api/public/products?category=...` | Manual |

---

## 10. Orders

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Multiple products per order (Order_Items) | `order.service.js`, `constants.js` | `POST /api/orders`, `GET /api/admin/orders` | Manual |
| Statuses: Pending, Processing, Accepted, Delivered, Returned, Rejected | `constants.js` ORDER_STATUSES | `PATCH /api/admin/orders/:id/status` | Manual |
| Admin actions: view, change status, set shipping, payment, deposit, proof, return reason | `admin.js`, `order.service.js` | `PATCH /api/admin/orders/:id/status` | Manual |
| Server-side financial calculations | `order.service.js`, `money.js` | `POST /api/orders`, `PATCH /api/admin/orders/:id/status` | Unit test |
| Revenue = customer-facing selling price | `analytics.service.js` | `GET /api/admin/dashboard` | Manual |
| Manufacturing Cost = sum(cost × qty) | `order.service.js` | N/A | Manual |
| Net Profit = Revenue - Manufacturing - Shipping | `analytics.service.js` | N/A | Manual |
| Raw Materials separate from Manufacturing | `analytics.service.js`, `fund.service.js` | N/A | Manual |

---

## 11. Fund Management

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Types: Capital Funding, Raw Material Expense | `constants.js` FUND_TYPES | `POST/GET /api/admin/fund` | Manual |
| Payment methods: InstaPay, Vodafone Cash, Cash | `constants.js` PAYMENT_METHODS | N/A | Manual |
| Team summary cards | `fund.service.js` | `GET /api/admin/fund` | Manual |
| Financial transaction email to responsible person | `fund.service.js`, `gmail.service.js` | `POST /api/admin/fund` | Manual |
| Mahrous-only edit | `fund.service.js`, `role.middleware.js` | `PATCH /api/admin/fund/:id` | Security test |

---

## 12. Analytics

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Delivered/Rejected/Returned counts | `analytics.service.js` | `GET /api/admin/analysis` | Manual |
| Best-selling products | `analytics.service.js` | `GET /api/admin/analysis` | Manual |
| Best male/female/overall customers | `analytics.service.js` | `GET /api/admin/analysis` | Manual |
| Location statistics | `analytics.service.js` | `GET /api/admin/analysis` | Manual |
| Financial dashboard metrics | `analytics.service.js` | `GET /api/admin/dashboard` | Manual |
| Chart data (doughnut) | `analytics.service.js` | `GET /api/admin/dashboard` | Manual |

---

## 13. Settings & Links

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| WhatsApp, Instagram, Facebook, TikTok, InstaPay, Company email | `settings.service.js`, `constants.js` | `GET /api/public/settings`, `GET/PATCH /api/admin/settings` | Manual |
| Customer site consumes same Settings | `index.js`, `settings.service.js` | `GET /api/public/settings` | Manual |

---

## 14. Reviews

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Admin add/edit/delete reviews | `review.service.js`, `admin.routes.js` | `GET/POST/PATCH/DELETE /api/admin/reviews` | Manual |
| Rating 1-5, text or image | `review.service.js`, `validators/index.js` | N/A | Manual |
| Approved/unapproved state | `review.service.js` | N/A | Manual |
| Sanitized display on customer site | `review.service.js`, `index.js` | `GET /api/public/reviews` | Manual |

---

## 15. Shipping

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Governorate-based rates in Sheets | `shipping.service.js`, `constants.js` | `GET /api/public/shipping?governorate=...` | Manual |
| Admin CRUD for rates | `shipping.service.js`, `admin.routes.js` | `GET/PATCH/DELETE /api/admin/shipping/:governorate` | Manual |
| Default rates for Egyptian governorates | `shipping.service.js` | N/A | Manual |

---

## 16. Security

| Requirement | Implementation Files | API Endpoints | Tests |
|-------------|---------------------|---------------|-------|
| Helmet.js headers | `server.js` | All | N/A |
| CORS restricted to known origins | `server.js` | All | Security test |
| Rate limiting (login, orders, API) | `rate-limit.middleware.js` | Auth, Orders, API | Security test |
| Input validation (express-validator) | `validators/index.js`, `validate.middleware.js` | All POST/PATCH | Security test |
| Secure cookies (HTTP-only, Secure, SameSite=None in production; Lax in development) | `auth.routes.js` | `POST /api/auth/login` | Security test |
| Authorization middleware | `role.middleware.js`, `auth.middleware.js` | All `/api/admin/*` | Security test |
| No stack traces in production | `error.middleware.js` | All | Security test |
| File upload validation | `drive.service.js`, `validators/index.js` | Upload endpoints | Security test |

---

## 17. Business Rules Verification

| Requirement | Implementation | Verification |
|-------------|---------------|--------------|
| Revenue: only Delivered orders | `analytics.service.js` line 14 | Code review |
| Manufacturing: product cost × qty | `order.service.js` line 181 | Code review |
| Shipping: final order shipping | `order.service.js` line 183 | Code review |
| Raw Materials: Fund transactions | `analytics.service.js` lines 24-30 | Code review |
| Net Profit = Rev - Mfg - Ship - Raw | `analytics.service.js` line 34 | Code review |
| Funding separate from Revenue | `analytics.service.js` line 35 | Code review |
| Profit Per Member = Net Profit / Active Members | `analytics.service.js` line 39 | Code review |
| Example: Sale=5000, Mfg=2000, Ship=500 → NP=2500 | `money.test.js` line 74 | Unit test |
| Add Raw=300 → Costs=2800, NP=2200 | `money.test.js` line 74 | Unit test |
| Funding=1000 → NP+Funding=3200 | `analytics.service.js` line 35 | Code review |

---

## 18. Deployment

| Requirement | Implementation Files | Status |
|-------------|---------------------|--------|
| GitHub Pages frontend | `frontend/`, `docs/DEPLOYMENT.md` | Ready |
| Railway backend | `backend/`, `docs/DEPLOYMENT.md` | Ready |
| Google Cloud setup docs | `docs/GOOGLE_SETUP.md` | Complete |
| Environment variables documented | `backend/.env.example` | Complete |
| .gitignore excludes secrets | `.gitignore` | Complete |
| Health endpoint | `public.routes.js` `/api/health` | Ready |

---

## 19. Test Coverage

| Test File | Coverage |
|-----------|----------|
| `backend/tests/money.test.js` | Money utilities, financial calculations |
| Manual tests | All customer flows, admin flows, integrations |

---

## Legend

- **Implementation Files**: Source code files implementing the requirement
- **API Endpoints**: REST endpoints exposing the functionality
- **Tests**: Automated or manual test coverage
- **Code review**: Verified by source code inspection
- **Manual**: Requires manual testing
- **Security test**: Verified through security audit
- **Unit test**: Covered by Jest tests