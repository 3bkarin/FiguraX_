# Google Sheets Schema

## Overview

All business data is stored in Google Sheets. The backend reads/writes via Google Sheets API. Sheets are the source of truth - manual edits in Sheets are reflected in the application.

## Sheet Names

| Sheet | Purpose |
|-------|---------|
| `Users` | Admin authentication |
| `Categories` | Product categories |
| `Products` | Product catalog |
| `Pending_Orders` | New orders awaiting processing |
| `Order_Items` | Line items for orders (multiple products) |
| `Accepted_Orders` | Processed orders with financial snapshots |
| `Fund` | Capital funding & raw material expenses |
| `Activity_Logs` | Audit trail of admin actions |
| `Returns` | Returned orders |
| `Reviews` | Customer testimonials |
| `Shipping_Rates` | Governorate-based shipping fees |
| `Settings` | Key-value configuration |
| `Idempotency` | Duplicate request protection |

---

## Users

| Column | Type | Description |
|--------|------|-------------|
| `ID` | String | Unique identifier (USR-...) |
| `Username` | String | Login username |
| `PasswordHash` | String | Argon2id hash |
| `Email` | String | Admin email |
| `Role` | String | `ADMIN` or `FINANCE_ADMIN` |
| `Permissions` | String | Comma-separated (e.g., `finance_transaction_edit`) |
| `Active` | Boolean | `true`/`false` |
| `CreatedAt` | ISO Date | Creation timestamp |
| `UpdatedAt` | ISO Date | Last update timestamp |

### Default Users
| Username | Email | Role | Permissions |
|----------|-------|------|-------------|
| Mazen | mazen2005engeneering@gmail.com | ADMIN | - |
| Mahrous | abdelrahman.mahrous2005@gmail.com | FINANCE_ADMIN | finance_transaction_edit |
| Mohanad | mohanadashraf145@gmail.com | ADMIN | - |
| Selim | mohamedselim612005@gmail.com | ADMIN | - |
| Ashraf | abdulllavh@gmail.com | ADMIN | - |

---

## Categories

| Column | Type | Description |
|--------|------|-------------|
| `ID` | String | Unique identifier (CAT-...) |
| `Name` | String | Category name |
| `Description` | String | Optional description |
| `ProductCount` | Number | Calculated count of active products |
| `Active` | Boolean | `true`/`false` |
| `CreatedAt` | ISO Date | Creation timestamp |
| `UpdatedAt` | ISO Date | Last update timestamp |

---

## Products

| Column | Type | Description |
|--------|------|-------------|
| `ID` | String | Unique identifier (PRD-...) |
| `CategoryID` | String | Reference to Categories.ID |
| `CategoryName` | String | Denormalized for display |
| `Name` | String | Product name (unique) |
| `Description` | String | Product description |
| `Dimensions` | String | Format: "X*Y*Z cm" |
| `Weight` | Number | Weight in grams |
| `InfillPercent` | Number | 3D print infill percentage |
| `Material` | String | PLA, PETG, Resin, etc. |
| `ManufacturingCost` | Number | Cost paid to 3D printing provider |
| `SellingPrice` | Number | Customer-facing price |
| `ImageURL` | String | Primary image (Drive public URL) |
| `GalleryURLs` | String | Comma-separated additional images |
| `Active` | Boolean | `true`/`false` |
| `CreatedAt` | ISO Date | Creation timestamp |
| `UpdatedAt` | ISO Date | Last update timestamp |

---

## Pending_Orders

| Column | Type | Description |
|--------|------|-------------|
| `OrderID` | String | Unique identifier (ORD-...) |
| `Date` | ISO Date | Order creation timestamp |
| `CustomerName` | String | Customer full name |
| `CustomerEmail` | String | Customer email (required) |
| `Gender` | String | `ذكر` or `أنثى` |
| `Phone` | String | Phone number |
| `Governorate` | String | Egyptian governorate |
| `DetailedAddress` | String | Full address |
| `LocationURL` | String | Google Maps link |
| `Platform` | String | `website`, `انستجرام`, `واتساب` |
| `PaymentMethod` | String | `cash_on_delivery`, `instapay` |
| `Notes` | String | Customer notes |
| `Subtotal` | Number | Sum of item prices |
| `ShippingFee` | Number | Shipping cost |
| `TotalPrice` | Number | Subtotal + Shipping |
| `Status` | String | `Pending`, `Processing`, `Accepted`, `Delivered`, `Returned`, `Rejected` |
| `RegisteredBy` | String | Admin username or `website` |
| `CreatedAt` | ISO Date | Creation timestamp |
| `UpdatedAt` | ISO Date | Last update timestamp |

---

## Order_Items

| Column | Type | Description |
|--------|------|-------------|
| `OrderID` | String | Reference to Pending_Orders.OrderID |
| `ProductID` | String | Reference to Products.ID |
| `ProductNameSnapshot` | String | Product name at time of order |
| `Quantity` | Number | Ordered quantity |
| `UnitPriceSnapshot` | Number | Selling price at time of order |
| `ManufacturingCostSnapshot` | Number | Manufacturing cost at time of order |
| `LineTotal` | Number | UnitPrice × Quantity |
| `CreatedAt` | ISO Date | Creation timestamp |

> **Note**: Snapshots ensure historical orders don't change if product prices change later.

---

## Accepted_Orders

| Column | Type | Description |
|--------|------|-------------|
| `OrderID` | String | Reference to original order |
| `AcceptedDate` | ISO Date | When moved to accepted |
| `CustomerName` | String | Customer name |
| `CustomerEmail` | String | Customer email |
| `Gender` | String | Customer gender |
| `Phone` | String | Customer phone |
| `Governorate` | String | Customer governorate |
| `Address` | String | Customer address |
| `LocationURL` | String | Maps link |
| `ProductsSummary` | String | Comma-separated product names |
| `QuantitySummary` | String | Comma-separated quantities |
| `CategorySummary` | String | Comma-separated categories |
| `Revenue` | Number | Total selling price (subtotal) |
| `ManufacturingCost` | Number | Sum of manufacturing costs |
| `ShippingCost` | Number | Actual shipping expense |
| `Deposit` | Number | Amount paid by customer |
| `Remaining` | Number | Revenue - Deposit |
| `TotalCosts` | Number | Manufacturing + Shipping |
| `NetProfit` | Number | Revenue - TotalCosts |
| `ProfitPerMember` | Number | NetProfit / Team Size |
| `PaymentMethod` | String | `cash_on_delivery`, `instapay` |
| `PaymentProofURL` | String | Drive URL to payment proof |
| `Status` | String | `Accepted`, `Delivered`, `Processing` |
| `ResponsibleAdmin` | String | Admin who processed |
| `CreatedAt` | ISO Date | Original order date |
| `UpdatedAt` | ISO Date | Last status update |

> **Financial Rule**: Only `Delivered` orders contribute to dashboard metrics.

---

## Fund

| Column | Type | Description |
|--------|------|-------------|
| `ID` | String | Unique identifier (FND-...) |
| `Date` | ISO Date | Transaction timestamp |
| `Name` | String | Team member (Mazen, Mohanad, Selim, Mahrous, Ashraf) |
| `Type` | String | `تمويل رأس مال` or `مصروف خامات` |
| `Amount` | Number | Transaction amount |
| `Details` | String | Description |
| `PaymentMethod` | String | `أنستا باي`, `فودافون كاش`, `كاش` |
| `ImageURL` | String | Drive URL to receipt/proof |
| `AddedBy` | String | Admin username who recorded |
| `CreatedAt` | ISO Date | Creation timestamp |
| `UpdatedAt` | ISO Date | Last update timestamp |

> **Email Rule**: When a transaction is added, email is sent to the responsible team member's email (from Users sheet).

---

## Activity_Logs

| Column | Type | Description |
|--------|------|-------------|
| `DateTime` | ISO Date | Action timestamp |
| `Admin` | String | Admin username |
| `Action` | String | Action type (e.g., `إضافة منتج`, `تسجيل أوردر`) |
| `Details` | String | Full details |
| `AttachmentURL` | String | Drive URL or `لا يوجد` |
| `EmailStatus` | String | `مقبول`, `مرفوض`, `فشل الإيميل: ...` |
| `RequestID` | String | Optional correlation ID |
| `CreatedAt` | ISO Date | Log creation timestamp |

---

## Returns

| Column | Type | Description |
|--------|------|-------------|
| `OrderID` | String | Original order ID |
| `Date` | ISO Date | Return timestamp |
| `CustomerName` | String | Customer name |
| `Products` | String | Returned products |
| `ReturnReason` | String | Reason for return |
| `RecordedBy` | String | Admin username |
| `CreatedAt` | ISO Date | Creation timestamp |

---

## Reviews

| Column | Type | Description |
|--------|------|-------------|
| `ID` | String | Unique identifier (REV-...) |
| `Date` | ISO Date | Review timestamp |
| `CustomerName` | String | Customer name |
| `Rating` | Number | 1-5 stars |
| `ContentType` | String | `text` or `image` |
| `Content` | String | Text content or Drive image URL |
| `AddedBy` | String | Admin username |
| `Approved` | Boolean | `true`/`false` (for public display) |
| `CreatedAt` | ISO Date | Creation timestamp |
| `UpdatedAt` | ISO Date | Last update timestamp |
| `CustomerEmail` | String | Customer email for verified customer reviews |
| `OrderID` | String | Delivered order associated with the review |
| `ProductNames` | String | Product names from the order |
| `Source` | String | `customer` or `admin` |

---

## Shipping_Rates

| Column | Type | Description |
|--------|------|-------------|
| `Governorate` | String | Egyptian governorate name |
| `ShippingFee` | Number | Shipping cost in EGP |
| `Active` | Boolean | `true`/`false` |
| `UpdatedAt` | ISO Date | Last update timestamp |

### Default Rates
| Governorate | Fee (EGP) |
|-------------|-----------|
| القاهرة, الجيزة | 50 |
| الإسكندرية | 60 |
| القليوبية | 55 |
| المنوفية, الغربية | 60 |
| البحيرة, كفر الشيخ | 65 |
| الدقهلية, الشرقية | 65 |
| دمياط, بورسعيد, الإسماعيلية, السويس | 70 |
| شمال سيناء, جنوب سيناء, البحر الأحمر | 80 |
| الفيوم | 65 |
| بني سويف | 70 |
| المنيا | 75 |
| أسيوط | 80 |
| سوهاج | 85 |
| قنا | 90 |
| الأقصر, أسوان | 90-95 |
| الوادي الجديد | 100 |
| مطروح | 90 |

---

## Settings

| Column | Type | Description |
|--------|------|-------------|
| `Key` | String | Configuration key |
| `Value` | String | Configuration value |
| `Description` | String | Human-readable description |
| `UpdatedAt` | ISO Date | Last update timestamp |

### Default Keys
| Key | Default Value | Description |
|-----|---------------|-------------|
| `brand_name` | `FIGURAX Store` | Brand name |
| `whatsapp` | `01119668221` | WhatsApp number |
| `instagram` | `https://instagram.com/figurax_verse` | Instagram URL |
| `facebook` | `` | Facebook URL |
| `tiktok` | `https://tiktok.com/@figurax.verse` | TikTok URL |
| `instapay_username` | `abdelrahman.mahrous77@instapay` | InstaPay username |
| `instapay_link` | `https://ipn.eg/S/.../5rAGt1` | InstaPay payment link |
| `company_email` | `figuraxverse@gmail.com` | Notification email |
| `currency` | `EGP` | Currency code |
| `team_size` | `5` | Active team members |

---

## Idempotency

| Column | Type | Description |
|--------|------|-------------|
| `Key` | String | Idempotency key (e.g., `order:timestamp-random`) |
| `Response` | String | JSON response cached |
| `CreatedAt` | ISO Date | Creation timestamp |
| `ExpiresAt` | ISO Date | Expiration (24 hours) |

> **Cleanup**: Run periodically to remove expired keys.

---

## ID Format

| Prefix | Example | Used For |
|--------|---------|----------|
| `USR-` | `USR-20260919-A1B2C3` | Users |
| `CAT-` | `CAT-20260919-X9Y8Z7` | Categories |
| `PRD-` | `PRD-20260919-Q1W2E3` | Products |
| `ORD-` | `ORD-20260919-R4T5Y6` | Orders |
| `FND-` | `FND-20260919-U7I8O9` | Fund transactions |
| `REV-` | `REV-20260919-P0L9K8` | Reviews |

Format: `{PREFIX}-{TIMESTAMP_BASE36}-{RANDOM_BASE36}`

---

## Backward Compatibility

Existing sheets from old system are preserved:
- Column order may differ
- New columns appended to the right
- Missing columns handled gracefully
- `ProductCount` in Categories recalculated on read

## Data Integrity Rules

1. **Never delete rows** - Use `Active = false` for soft delete
2. **Snapshot prices** - Order items store price at order time
3. **Foreign keys** - Validate references on write
4. **Unique constraints** - Product names, category names, usernames
5. **Audit trail** - Every write logs to Activity_Logs
6. **Idempotency** - Order creation protected by keys