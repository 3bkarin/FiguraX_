FIGURAX V3

- Unified black/red/white visual system for customer + admin.
- Customer header logo is centered and has no circle/border. Admin link removed from customer navigation.
- Checkout redirects to order-success.html after a successful order; no admin name/email shown to customer.
- Admin product customization now uses a visual field builder instead of JSON.
- Finance metrics read Arabic Google Sheet headers and expose cashBalance.
- Reviews endpoint is resilient to empty/missing rows.

Google Sheet: existing Products/Orders/Fund schemas are retained. No new columns are required by this V3 theme/UI update.


## Final V4 patch
- Removed logo images from the UI and replaced them with a centered FIGURAX wordmark.
- Hardened admin order loading with fresh Sheets reads and legacy row normalization.
- Kept black/red/white visual system and responsive admin layout.
