# FIGURAX FINAL V5

## Order/Admin fix

The Admin Orders endpoint was failing while loading pending orders because `getOrderItems()` treated the result of `getAllRows()` as `{ rows }`, but `getAllRows()` returns an array of `{ row, rowIndex, headers }` records. That caused the admin orders request to fail even though the order was correctly saved to Google Sheets.

V5 fixes this by:
- reading Order_Items correctly;
- building an order-items map once for pending orders;
- returning `source: pending` on pending orders;
- keeping fresh Google Sheets reads for admin order loading.

The existing Pending_Orders and Accepted_Orders header schemas are preserved:

### Pending_Orders
OrderID | Date | CustomerName | CustomerEmail | Gender | Phone | Governorate | DetailedAddress | LocationURL | Platform | PaymentMethod | Notes | Subtotal | ShippingFee | TotalPrice | Status | RegisteredBy | CreatedAt | UpdatedAt

### Accepted_Orders
OrderID | AcceptedDate | CustomerName | CustomerEmail | Gender | Phone | Governorate | Address | LocationURL | ProductsSummary | QuantitySummary | CategorySummary | Revenue | ManufacturingCost | ShippingCost | Deposit | Remaining | TotalCosts | NetProfit | ProfitPerMember | PaymentMethod | PaymentProofURL | Status | ResponsibleAdmin | CreatedAt | UpdatedAt

## Gmail OAuth

The backend expects these variables:

GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REFRESH_TOKEN
GMAIL_SENDER=figuraxverse@gmail.com

Use a Web application OAuth client in the same Google Cloud project, add this exact redirect URI:

https://developers.google.com/oauthplayground

Then use OAuth 2.0 Playground with "Use your own OAuth credentials" and authorize:

https://www.googleapis.com/auth/gmail.send

Exchange the authorization code for tokens and copy the refresh token into `.env`.

Do not reuse the Drive refresh token for Gmail. The refresh token must have been issued for the same Gmail OAuth client ID/secret pair.
