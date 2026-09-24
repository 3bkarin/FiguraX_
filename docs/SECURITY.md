# FIGURAX Security Checklist

This document describes the current implementation. It deliberately distinguishes local code checks from production controls that require deployment verification.

## Authentication & Authorization

- Argon2id password hashing is implemented.
- Passwords are not returned by the API.
- Sessions use HttpOnly cookies.
- Production cookies use `Secure` and `SameSite=None` because the planned frontend/backend are on different origins.
- State-changing requests are restricted to configured trusted origins.
- Admin API routes require authentication and an admin role.
- Financial transaction editing is enforced server-side by the configured Mahrous identity.
- Private Drive access requires the explicit `private_file_access` permission.
- Client-side hiding is not the security boundary.

## API Security

- Helmet is enabled.
- CORS uses configured frontend origins.
- Login, order and upload rate limits are implemented.
- Order creation requires an idempotency key.
- Input validation uses express-validator.
- Product selling price and manufacturing cost are loaded server-side when a customer creates an order.
- Customer-controlled `totalPrice` cannot overwrite the authoritative order total during status updates.

## File Uploads

- Allowed image MIME types are restricted.
- File extension must match MIME type.
- Image magic bytes are checked for JPEG, PNG, GIF and WebP.
- File size is capped at 10 MB.
- Filenames are sanitized.
- Private payment/fund files are not made public.
- Upload endpoints have rate limiting.

## Frontend Security

- Dynamic URLs are passed through an HTTP/HTTPS URL sanitizer before being used in `href`/`src` attributes.
- Dynamic text is escaped where it is inserted into HTML.
- The admin page currently contains legacy inline event attributes and therefore should not be described as CSP-strict. They are backed by explicitly exposed module functions and server-side authorization.
- No sensitive credentials are stored in frontend JavaScript.

## Google Data Protection

- Google credentials are expected through environment variables.
- Real credentials must never be committed.
- Public Drive access is limited to intended public assets.
- Private file access is mediated by the backend authorization layer.
- The backend creates missing Sheets/folders without intentionally deleting existing rows.

## Email Security

- Sender is configured as `figuraxverse@gmail.com`.
- Customer order confirmation is sent once for a successfully created order, subject to the email provider being available.
- Financial notifications resolve the responsible user's email from the Users data.
- Dynamic email URLs are restricted to HTTP/HTTPS.

## Verification status

The repeatable local gate currently passes. Full dependency installation, Jest integration tests, Google APIs, Railway and GitHub Pages still require real-environment verification before public launch.
