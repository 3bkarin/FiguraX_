# FIGURAX setup notes

## Google Sheets
The backend now attempts to extend existing sheet headers automatically on startup.

For the **Products** sheet, make sure these columns exist (they can be appended at the end if missing):

- السعر قبل الخصم / OriginalPrice
- مميز / Featured
- قابل للتخصيص / Customizable
- نوع المنتج / ProductType
- Slug
- حقول التخصيص / CustomizationSchema
- Active

If the automatic header update is blocked for any reason, add those columns manually in row 1 of the Products sheet.

## Custom product fields
The admin product form supports a JSON schema for dynamic customization fields.
Example:
```json
[
  {
    "id": "name",
    "labelAr": "الاسم",
    "labelEn": "Name",
    "type": "text",
    "required": true
  }
]
```

## Logo
Place the design logo at:
- `frontend/assets/logo.png`

The frontend already points to that file.


## Order / Review header repair
The backend now enforces the exact header order for `Pending_Orders`, `Accepted_Orders`, and `Reviews` because those services write rows positionally. Do not manually insert columns inside these sheets. If you add a custom column, add it to `backend/src/config/constants.js` and the corresponding service writer together.

`Pending_Orders` expected headers:
`OrderID | Date | CustomerName | CustomerEmail | Gender | Phone | Governorate | DetailedAddress | LocationURL | Platform | PaymentMethod | Notes | Subtotal | ShippingFee | TotalPrice | Status | RegisteredBy | CreatedAt | UpdatedAt`

`Reviews` expected headers:
`ID | Date | CustomerName | Rating | ContentType | Content | AddedBy | Approved | CreatedAt | UpdatedAt`
