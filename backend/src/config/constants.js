export const SHEET_NAMES = {
  USERS: 'Users',
  CATEGORIES: 'Categories',
  PRODUCTS: 'Products',
  PENDING_ORDERS: 'Pending_Orders',
  ACCEPTED_ORDERS: 'Accepted_Orders',
  ORDER_ITEMS: 'Order_Items',
  FUND: 'Fund',
  ACTIVITY_LOGS: 'Activity_Logs',
  RETURNS: 'Returns',
  REVIEWS: 'Reviews',
  SHIPPING_RATES: 'Shipping_Rates',
  SETTINGS: 'Settings',
  IDEMPOTENCY: 'Idempotency',
  SESSIONS: 'Sessions',
};

export const SHEET_HEADERS = {
  [SHEET_NAMES.USERS]: [
    'ID',
    'Username',
    'PasswordHash',
    'Email',
    'Role',
    'Permissions',
    'Active',
    'CreatedAt',
    'UpdatedAt',
  ],

  [SHEET_NAMES.CATEGORIES]: [
    'ID',
    'اسم التصنيف',
    'الوصف',
    'عدد المنتجات',
    'Active',
    'CreatedAt',
    'UpdatedAt',
  ],

  [SHEET_NAMES.PRODUCTS]: [
    'ID',
    'التصنيف',
    'اسم المنتج',
    'لأبعاد (X*Y*Z سم)',
    'الوزن (جرام)',
    'Infill %',
    'تكلفة التصنيع عند التاجر',
    'سعر البيع',
    'مادة التصنيع',
    'صورة المنتج',
    'السعر قبل الخصم',
    'مميز',
    'قابل للتخصيص',
    'نوع المنتج',
    'Slug',
    'حقول التخصيص',
    'Active',
    'Description',
  ],

  [SHEET_NAMES.PENDING_ORDERS]: [
    'OrderID', 'Date', 'CustomerName', 'CustomerEmail', 'Gender', 'Phone',
    'Governorate', 'DetailedAddress', 'LocationURL', 'Platform', 'PaymentMethod',
    'Notes', 'Subtotal', 'ShippingFee', 'TotalPrice', 'Status', 'RegisteredBy',
    'CreatedAt', 'UpdatedAt', 'Language',
  ],

  [SHEET_NAMES.ACCEPTED_ORDERS]: [
    'OrderID', 'AcceptedDate', 'CustomerName', 'CustomerEmail', 'Gender', 'Phone',
    'Governorate', 'Address', 'LocationURL', 'ProductsSummary', 'QuantitySummary',
    'CategorySummary', 'Revenue', 'ManufacturingCost', 'ShippingCost', 'Deposit',
    'Remaining', 'TotalCosts', 'NetProfit', 'ProfitPerMember', 'PaymentMethod',
    'PaymentProofURL', 'Status', 'ResponsibleAdmin', 'CreatedAt', 'UpdatedAt', 'Language',
  ],

  [SHEET_NAMES.ORDER_ITEMS]: [
    'OrderID',
    'ProductID',
    'ProductNameSnapshot',
    'Quantity',
    'UnitPriceSnapshot',
    'ManufacturingCostSnapshot',
    'LineTotal',
    'CreatedAt',
  ],

  [SHEET_NAMES.FUND]: [
    'ID',
    'التاريخ',
    'الاسم',
    'النوع (تمويل/مصروف خامات)',
    'المبلغ',
    'التفاصيل',
    'طريقة الدفع',
    'صورة المعاملة',
    'المسئول',
    'CreatedAt',
    'UpdatedAt',
  ],

  [SHEET_NAMES.ACTIVITY_LOGS]: [
    'التاريخ والوقت',
    'المسؤول',
    'نوع الإجراء',
    'التفاصيل',
    'رابط الصورة',
  ],

  [SHEET_NAMES.RETURNS]: [
    'Order ID',
    'التاريخ',
    'اسم العميل',
    'المنتج',
    'سبب الارجاع',
    'سُجل بواسطة',
  ],

  [SHEET_NAMES.REVIEWS]: [
    'ID', 'Date', 'CustomerName', 'Rating', 'ContentType', 'Content', 'AddedBy',
    'Approved', 'CreatedAt', 'UpdatedAt', 'CustomerEmail', 'OrderID',
    'ProductNames', 'Source',
  ],

  [SHEET_NAMES.SHIPPING_RATES]: [
    'Governorate',
    'ShippingFee',
    'Active',
    'UpdatedAt',
  ],

  [SHEET_NAMES.SETTINGS]: [
    'Key',
    'Value',
    'Description',
    'UpdatedAt',
  ],

  [SHEET_NAMES.IDEMPOTENCY]: [
    'Key',
    'Response',
    'CreatedAt',
    'ExpiresAt',
  ],

  [SHEET_NAMES.SESSIONS]: [
    'Key',
    'Response',
    'CreatedAt',
    'ExpiresAt',
  ],
};

export const ORDER_STATUSES = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  ACCEPTED: 'Accepted',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
  REJECTED: 'Rejected',
};

export const FUND_TYPES = {
  CAPITAL_FUNDING: 'تمويل رأس مال',
  RAW_MATERIAL_EXPENSE: 'مصروف خامات',
};

export const PAYMENT_METHODS = {
  INSTAPAY: 'أنستا باي',
  VODAFONE_CASH: 'فودافون كاش',
  CASH: 'كاش',
  CASH_ON_DELIVERY: 'نقداً عند الاستلام',
};

export const PLATFORMS = {
  INSTAGRAM: 'انستجرام',
  WHATSAPP: 'واتساب',
  WEBSITE: 'الموقع الإلكتروني',
};

export const GENDERS = {
  MALE: 'ذكر',
  FEMALE: 'أنثى',
};

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  FINANCE_ADMIN: 'FINANCE_ADMIN',
};

export const PERMISSIONS = {
  PRIVATE_FILE_ACCESS: 'private_file_access',
  FINANCE_TRANSACTION_EDIT: 'finance_transaction_edit',
};

export const SETTINGS_KEYS = {
  BRAND_NAME: 'brand_name',
  WHATSAPP: 'whatsapp',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TIKTOK: 'tiktok',
  INSTAPAY_USERNAME: 'instapay_username',
  INSTAPAY_LINK: 'instapay_link',
  COMPANY_EMAIL: 'company_email',
  CURRENCY: 'currency',
  TEAM_SIZE: 'team_size',
};

export const DEFAULT_SETTINGS = {
  [SETTINGS_KEYS.BRAND_NAME]: {
    value: 'FIGURAX Store',
    description: 'Brand name displayed on website',
  },

  [SETTINGS_KEYS.WHATSAPP]: {
    value: '01119668221',
    description: 'WhatsApp contact number',
  },

  [SETTINGS_KEYS.INSTAGRAM]: {
    value: 'https://www.instagram.com/figurax_verse',
    description: 'Instagram profile URL',
  },

  [SETTINGS_KEYS.FACEBOOK]: {
    value: '',
    description: 'Facebook page URL',
  },

  [SETTINGS_KEYS.TIKTOK]: {
    value: 'https://www.tiktok.com/@figurax.verse',
    description: 'TikTok profile URL',
  },

  [SETTINGS_KEYS.INSTAPAY_USERNAME]: {
    value: 'abdelrahman.mahrous77@instapay',
    description: 'InstaPay username',
  },

  [SETTINGS_KEYS.INSTAPAY_LINK]: {
    value: 'https://ipn.eg/S/abdelrahman.mahrous77/instapay/5rAGt1',
    description: 'InstaPay direct payment link',
  },

  [SETTINGS_KEYS.COMPANY_EMAIL]: {
    value: 'figuraxverse@gmail.com',
    description: 'Company email for notifications',
  },

  [SETTINGS_KEYS.CURRENCY]: {
    value: 'EGP',
    description: 'Default currency code',
  },

  [SETTINGS_KEYS.TEAM_SIZE]: {
    value: '5',
    description: 'Number of team members for profit sharing',
  },
};

export const DRIVE_FOLDERS = {
  PRODUCTS: 'Products',
  PAYMENT_PROOFS: 'Payment_Proofs',
  FUND_TRANSACTIONS: 'Fund_Transactions',
  REVIEWS: 'Reviews',
  OTHER: 'Other',
};

export const ID_PREFIXES = {
  ORDER: 'ORD',
  PRODUCT: 'PRD',
  CATEGORY: 'CAT',
  FUND: 'FND',
  REVIEW: 'REV',
  USER: 'USR',
};

export const ADMIN_MAHROUS_EMAIL =
  'abdelrahman.mahrous2005@gmail.com';

export const ADMIN_MAHROUS_ID = '147897';

export const CACHE_TTL = {
  SETTINGS: 5 * 60 * 1000,
  SHIPPING_RATES: 10 * 60 * 1000,
  PRODUCTS: 2 * 60 * 1000,
  CATEGORIES: 5 * 60 * 1000,
};