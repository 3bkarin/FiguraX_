import {
  body,
  param,
  query,
} from 'express-validator';

// =====================================================
// AUTH
// =====================================================

export const loginValidator = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage(
      'Username is required'
    ),

  body('password')
    .notEmpty()
    .withMessage(
      'Password is required'
    ),
];

export const registerValidator = [
  body('username')
    .trim()
    .isLength({
      min: 3,
      max: 50,
    })
    .withMessage(
      'Username must be 3-50 characters'
    ),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage(
      'Valid email is required'
    ),

  body('password')
    .isLength({
      min: 8,
    })
    .withMessage(
      'Password must be at least 8 characters'
    ),
];

// =====================================================
// PRODUCTS
// =====================================================

export const productValidator = [
  body('categoryId')
    .notEmpty()
    .withMessage(
      'Category is required'
    ),

  body('categoryName')
    .notEmpty()
    .withMessage(
      'Category name is required'
    ),

  body('name')
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      'Product name must be 2-100 characters'
    ),

  body('description')
    .optional()
    .trim(),

  body('dimensions')
    .optional()
    .trim(),

  body('weight')
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      'Weight must be a positive number'
    ),

  body('infillPercent')
    .optional()
    .isInt({
      min: 0,
      max: 100,
    })
    .withMessage(
      'Infill must be 0-100'
    ),

  body('material')
    .optional()
    .trim(),

  body('manufacturingCost')
    .isFloat({
      min: 0,
    })
    .withMessage(
      'Manufacturing cost must be a positive number'
    ),

  body('sellingPrice')
    .isFloat({
      min: 0,
    })
    .withMessage(
      'Selling price must be a positive number'
    ),

  body('base64Image')
    .optional()
    .isString(),

  body('imageFileName')
    .optional()
    .isString(),

  body('fileName')
    .optional()
    .isString(),

  body('imageUrl')
    .optional()
    .isURL()
    .withMessage(
      'Image URL must be a valid URL'
    ),

  body('galleryImages')
    .optional()
    .isArray(),
];

// =====================================================
// CATEGORIES
// =====================================================

export const categoryValidator = [
  body('name')
    .trim()
    .isLength({
      min: 2,
      max: 50,
    })
    .withMessage(
      'Category name must be 2-50 characters'
    ),

  body('description')
    .optional()
    .trim(),
];

// =====================================================
// ORDERS
// =====================================================

export const orderValidator = [
  body('customer.name')
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      'Customer name is required'
    ),

  body('customer.email')
    .isEmail()
    .normalizeEmail()
    .withMessage(
      'Valid customer email is required'
    ),

  body('customer.gender')
    .isIn([
      'male',
      'female',
    ])
    .withMessage(
      'Gender must be male or female'
    ),

  body('customer.phone')
    .trim()
    .notEmpty()
    .withMessage(
      'Phone is required'
    ),

  body('customer.governorate')
    .trim()
    .notEmpty()
    .withMessage(
      'Governorate is required'
    ),

  body('customer.address')
    .trim()
    .notEmpty()
    .withMessage(
      'Address is required'
    ),

  body('customer.locationUrl')
    .optional({ values: 'falsy' })
    .custom((value) => {
      const url = String(value || '').trim();
      if (!url) return true;
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
        return true;
      } catch {
        throw new Error('Location URL must be a valid http/https URL');
      }
    }),

  body('paymentMethod')
    .isIn([
      'cash_on_delivery',
      'instapay',
    ])
    .withMessage(
      'Invalid payment method'
    ),

  body('notes')
    .optional()
    .trim(),

  body('language')
    .optional()
    .isIn([
      'ar',
      'en',
    ])
    .withMessage(
      'Language must be ar or en'
    ),

  body('items')
    .isArray({
      min: 1,
    })
    .withMessage(
      'At least one item is required'
    ),

  body('items.*.productId')
    .notEmpty()
    .withMessage(
      'Product ID is required'
    ),

  body('items.*.quantity')
    .isInt({
      min: 1,
    })
    .withMessage(
      'Quantity must be at least 1'
    ),

  body('platform')
    .optional()
    .isString(),
];

// =====================================================
// FUND
// =====================================================

export const fundValidator = [
  body('name')
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      'Valid team member name is required'
    ),

  body('type')
    .isIn([
      'تمويل رأس مال',
      'مصروف خامات',
    ])
    .withMessage(
      'Invalid transaction type'
    ),

  body('amount')
    .isFloat({
      min: 0.01,
    })
    .withMessage(
      'Amount must be positive'
    ),

  body('details')
    .trim()
    .notEmpty()
    .withMessage(
      'Details are required'
    ),

  body('paymentMethod')
    .isIn([
      'أنستا باي',
      'فودافون كاش',
      'كاش',
    ])
    .withMessage(
      'Invalid payment method'
    ),

  body('base64Image')
    .optional()
    .isString(),

  body('fileName')
    .optional()
    .isString(),
];

// =====================================================
// ORDER STATUS
// =====================================================

export const updateOrderStatusValidator = [
  param('id')
    .notEmpty()
    .withMessage(
      'Order ID is required'
    ),

  body('status')
    .optional()
    .isIn([
      'Pending',
      'Processing',
      'Accepted',
      'Delivered',
      'Returned',
      'Rejected',
    ])
    .withMessage(
      'Invalid status'
    ),

  body('shippingFee')
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      'Shipping fee must be positive'
    ),

  body('paymentMethod')
    .optional()
    .isIn([
      'cash_on_delivery',
      'instapay',
    ])
    .withMessage(
      'Invalid payment method'
    ),

  body('paymentType')
    .optional()
    .isIn([
      'full',
      'deposit',
    ])
    .withMessage(
      'Invalid payment type'
    ),

  body('depositAmount')
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      'Deposit must be positive'
    ),

  body('paymentProofUrl')
    .optional()
    .isURL()
    .withMessage(
      'Payment proof URL must be valid'
    ),

  body('paymentProofBase64')
    .optional()
    .isString(),

  body('paymentProofFileName')
    .optional()
    .isString(),

  body('returnReason')
    .optional()
    .trim(),
];

// =====================================================
// SHIPPING
// =====================================================

export const shippingRateValidator = [
  param('governorate')
    .notEmpty()
    .withMessage(
      'Governorate is required'
    ),

  body('fee')
    .isFloat({
      min: 0,
    })
    .withMessage(
      'Fee must be positive'
    ),
];

// =====================================================
// REVIEWS
// =====================================================

export const reviewValidator = [
  body('customerName')
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      'Customer name is required'
    ),

  body('rating')
    .isInt({
      min: 1,
      max: 5,
    })
    .withMessage(
      'Rating must be 1-5'
    ),

  body('contentType')
    .isIn([
      'text',
      'image',
    ])
    .withMessage(
      'Content type must be text or image'
    ),

  body('textContent')
    .optional()
    .trim(),

  body('base64Image')
    .optional()
    .isString(),

  body('fileName')
    .optional()
    .isString(),
];

// =====================================================
// SETTINGS
// =====================================================

export const settingsValidator = [
  body('settings')
    .isObject()
    .withMessage(
      'Settings must be an object'
    ),
];