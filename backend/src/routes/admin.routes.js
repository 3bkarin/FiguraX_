import express from 'express';

import {
  requireAuth,
} from '../middleware/auth.middleware.js';

import {
  requireRole,
  requireFinanceAdmin,
  requirePermission,
} from '../middleware/role.middleware.js';

import {
  validateRequest,
} from '../middleware/validate.middleware.js';

import {
  uploadRateLimit,
} from '../middleware/rate-limit.middleware.js';

import {
  productValidator,
  categoryValidator,
  updateOrderStatusValidator,
  orderValidator,
  fundValidator,
  shippingRateValidator,
  reviewValidator,
  settingsValidator,
} from '../validators/index.js';

import {
  getDashboardData,
} from '../services/analytics.service.js';

import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
} from '../services/product.service.js';

import {
  getPendingOrders,
  getAcceptedOrders,
  updateOrderStatus,
  getOrderById,
  createOrder,
} from '../services/order.service.js';

import {
  getFundTransactions,
  getTeamFundSummary,
  addFundTransaction,
  updateFundTransaction,
  getFundTransactionById,
} from '../services/fund.service.js';

import {
  getReviews,
  addReview,
  updateReview,
  deleteReview,
} from '../services/review.service.js';

import {
  getAllSettings,
  updateSettings,
} from '../services/settings.service.js';

import {
  getShippingRates,
  setShippingRate,
  deleteShippingRate,
} from '../services/shipping.service.js';

import {
  uploadFile,
  downloadPrivateFile,
} from '../services/drive.service.js';

import {
  sanitizeFileName,
} from '../utils/sanitize.js';

import {
  getAllRows,
  SHEET_NAMES,
} from '../services/sheets.service.js';


const router =
  express.Router();


// =====================================================
// AUTHORIZATION
// =====================================================

router.use(requireAuth);

router.use(
  requireRole(
    'ADMIN',
    'FINANCE_ADMIN'
  )
);


// =====================================================
// DASHBOARD
// =====================================================

router.get(
  '/dashboard',
  async (req, res, next) => {
    try {
      const data =
        await getDashboardData();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);


// =====================================================
// CATEGORIES
// =====================================================

router.get(
  '/categories',
  async (req, res, next) => {
    try {
      const categories =
        await getCategories();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/categories',
  categoryValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      const result =
        await createCategory(
          req.body
        );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);


router.patch(
  '/categories/:id',
  categoryValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      const result =
        await updateCategory(
          req.params.id,
          req.body
        );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);


// =====================================================
// PRODUCTS
// =====================================================

router.get(
  '/products',
  async (req, res, next) => {
    try {
      const products =
        await getProducts({
          activeOnly: false,
        });

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }
);


router.get(
  '/products/:id',
  async (req, res, next) => {
    try {
      const product =
        await getProductById(
          req.params.id
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message:
              'Product not found',
          },
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);


// =====================================================
// CREATE PRODUCT
// =====================================================

router.post(
  '/products',
  productValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      console.log(
        '📦 CREATE PRODUCT BODY:',
        {
          ...req.body,
          base64Image:
            req.body?.base64Image
              ? '[BASE64_PRESENT]'
              : undefined,
        }
      );

      const result =
        await createProduct(
          req.body,
          req.user
        );

      res.status(201).json({
        success: true,
        data: result,
      });

    } catch (error) {
      console.error(
        '❌ CREATE PRODUCT ERROR:',
        error.message
      );

      next(error);
    }
  }
);


// =====================================================
// UPDATE PRODUCT
// =====================================================

router.patch(
  '/products/:id',
  productValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      console.log(
        '📝 UPDATE PRODUCT BODY:',
        {
          ...req.body,
          base64Image:
            req.body?.base64Image
              ? '[BASE64_PRESENT]'
              : undefined,
        }
      );

      const result =
        await updateProduct(
          req.params.id,
          req.body,
          req.user
        );

      res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      console.error(
        '❌ UPDATE PRODUCT ERROR:',
        error.message
      );

      next(error);
    }
  }
);


// =====================================================
// DELETE PRODUCT
// =====================================================

router.delete(
  '/products/:id',
  async (req, res, next) => {
    try {
      const result =
        await deleteProduct(
          req.params.id
        );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);


// =====================================================
// PRODUCT IMAGE UPLOAD
// =====================================================

router.post(
  '/products/upload-image',
  uploadRateLimit,
  async (req, res, next) => {
    try {
      const {
        base64Image,
        fileName,
        imageFileName,
      } = req.body;


      const finalFileName =
        String(
          fileName ||
          imageFileName ||
          ''
        ).trim();


      if (
        !base64Image ||
        !finalFileName
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code:
              'VALIDATION_ERROR',

            message:
              'Image data and filename required',
          },
        });
      }


      console.log(
        '📤 Uploading product image:',
        finalFileName
      );


      // Product images are always
      // uploaded to the public
      // PRODUCTS Drive folder.
      const url =
        await uploadFile(
          base64Image,
          finalFileName,
          'PRODUCTS'
        );


      if (!url) {
        throw new Error(
          'Image uploaded but URL was not returned'
        );
      }


      console.log(
        '✅ Product image URL:',
        url
      );


      return res.json({
        success: true,

        data: {
          url,
        },
      });

    } catch (error) {
      console.error(
        '❌ PRODUCT IMAGE UPLOAD ERROR:',
        error
      );

      next(error);
    }
  }
);


// =====================================================
// PRIVATE DRIVE FILES
// =====================================================

router.get(
  '/drive/private/:fileId',
  requirePermission(
    'private_file_access'
  ),
  async (req, res, next) => {
    try {
      const {
        fileId,
      } = req.params;


      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: {
            code:
              'VALIDATION_ERROR',
            message:
              'File ID is required',
          },
        });
      }


      const result =
        await downloadPrivateFile(
          fileId,
          req.user
        );


      res.setHeader(
        'Content-Type',
        result.mimeType
      );


      res.setHeader(
        'Content-Disposition',
        `inline; filename="${sanitizeFileName(
          result.fileName
        )}"`
      );


      if (
        result.data &&
        typeof result.data.pipe ===
          'function'
      ) {
        return result.data.pipe(
          res
        );
      }


      res.send(
        result.data
      );

    } catch (error) {

      if (
        error.message ===
        'Authentication required'
      ) {
        return res.status(401).json({
          success: false,
          error: {
            code:
              'UNAUTHORIZED',
            message:
              'Authentication required',
          },
        });
      }


      if (
        error.message ===
        'Forbidden'
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code:
              'FORBIDDEN',
            message:
              'Private file access denied',
          },
        });
      }


      if (
        error.message ===
        'Invalid file ID'
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code:
              'VALIDATION_ERROR',
            message:
              'Invalid file ID',
          },
        });
      }


      if (
        error.message ===
        'File not found'
      ) {
        return res.status(404).json({
          success: false,
          error: {
            code:
              'NOT_FOUND',
            message:
              'File not found',
          },
        });
      }


      next(error);
    }
  }
);


// =====================================================
// ORDERS
// =====================================================

router.post(
  '/orders',
  orderValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      const result =
        await createOrder({
          ...req.body,
          language:
            req.body.language ||
            'ar',
        });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);


router.get(
  '/orders',
  async (req, res, next) => {
    try {
      const [
        pending,
        accepted,
      ] = await Promise.all([
        getPendingOrders(),
        getAcceptedOrders(),
      ]);

      const orders = [...pending, ...accepted].sort(
        (a, b) => new Date(b.date || b.acceptedDate || 0) - new Date(a.date || a.acceptedDate || 0)
      );

      res.json({
        success: true,
        data: {
          pending,
          accepted,
          orders,
          counts: {
            pending: pending.length,
            accepted: accepted.length,
            total: orders.length,
          },
        },
      });

    } catch (error) {
      next(error);
    }
  }
);


router.get(
  '/orders/:id',
  async (req, res, next) => {
    try {
      const order =
        await getOrderById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code:
              'NOT_FOUND',
            message:
              'Order not found',
          },
        });
      }

      res.json({
        success: true,
        data: order,
      });

    } catch (error) {
      next(error);
    }
  }
);


router.patch(
  '/orders/:id/status',
  uploadRateLimit,
  updateOrderStatusValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      const result =
        await updateOrderStatus(
          req.params.id,
          req.body,
          req.user.username
        );

      res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      next(error);
    }
  }
);


// =====================================================
// FUND
// =====================================================

router.get(
  '/fund',
  async (req, res, next) => {
    try {
      const {
        name,
        type,
      } = req.query;

      const [
        transactions,
        summary,
      ] = await Promise.all([
        getFundTransactions({
          name,
          type,
        }),
        getTeamFundSummary(),
      ]);

      res.json({
        success: true,
        data: {
          transactions,
          summary,
        },
      });

    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/fund',
  uploadRateLimit,
  fundValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      const result =
        await addFundTransaction(
          req.body,
          req.user
        );

      res.status(201).json({
        success: true,
        data: result,
      });

    } catch (error) {
      next(error);
    }
  }
);


router.get(
  '/fund/:id',
  async (req, res, next) => {
    try {
      const transaction =
        await getFundTransactionById(
          req.params.id
        );

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: {
            code:
              'NOT_FOUND',
            message:
              'Transaction not found',
          },
        });
      }

      res.json({
        success: true,
        data: transaction,
      });

    } catch (error) {
      next(error);
    }
  }
);


router.patch(
  '/fund/:id',
  requireFinanceAdmin,
  fundValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      const result =
        await updateFundTransaction(
          req.params.id,
          req.body,
          req.user
        );

      res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      next(error);
    }
  }
);


// =====================================================
// ANALYSIS
// =====================================================

router.get(
  '/analysis',
  async (req, res, next) => {
    try {
      const data =
        await getDashboardData();

      res.json({
        success: true,
        data:
          data.analysis,
      });

    } catch (error) {
      next(error);
    }
  }
);


// =====================================================
// REVIEWS
// =====================================================

router.get(
  '/reviews',
  async (req, res, next) => {
    try {
      const reviews =
        await getReviews(false);

      res.json({
        success: true,
        data: reviews,
      });

    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/reviews',
  uploadRateLimit,
  reviewValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      const result =
        await addReview(
          req.body,
          req.user
        );

      res.status(201).json({
        success: true,
        data: result,
      });

    } catch (error) {
      next(error);
    }
  }
);


router.patch(
  '/reviews/:id',
  async (req, res, next) => {
    try {
      const result =
        await updateReview(
          req.params.id,
          req.body
        );

      res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      next(error);
    }
  }
);


router.delete(
  '/reviews/:id',
  async (req, res, next) => {
    try {
      const result =
        await deleteReview(
          req.params.id
        );

      res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      next(error);
    }
  }
);


// =====================================================
// SETTINGS
// =====================================================

router.get(
  '/settings',
  async (req, res, next) => {
    try {
      const settings =
        await getAllSettings();

      res.json({
        success: true,
        data: settings,
      });

    } catch (error) {
      next(error);
    }
  }
);


router.patch(
  '/settings',
  settingsValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      await updateSettings(
        req.body.settings
      );

      res.json({
        success: true,
        message:
          'Settings updated',
      });

    } catch (error) {
      next(error);
    }
  }
);


// =====================================================
// SHIPPING
// =====================================================

router.get(
  '/shipping',
  async (req, res, next) => {
    try {
      const rates =
        await getShippingRates();

      res.json({
        success: true,
        data: rates,
      });

    } catch (error) {
      next(error);
    }
  }
);


router.patch(
  '/shipping/:governorate',
  shippingRateValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      await setShippingRate(
        req.params.governorate,
        req.body.fee
      );

      res.json({
        success: true,
        message:
          'Shipping rate updated',
      });

    } catch (error) {
      next(error);
    }
  }
);


router.delete(
  '/shipping/:governorate',
  async (req, res, next) => {
    try {
      await deleteShippingRate(
        req.params.governorate
      );

      res.json({
        success: true,
        message:
          'Shipping rate deleted',
      });

    } catch (error) {
      next(error);
    }
  }
);


// =====================================================
// ACTIVITY LOGS
// =====================================================

router.get(
  '/activity-logs',
  async (req, res, next) => {
    try {
      const records =
        await getAllRows(
          SHEET_NAMES.ACTIVITY_LOGS
        );

      const logs =
        records
          .map(
            (record) =>
              record.row
          )
          .filter(
            (row) =>
              row.DateTime
          )
          .map((row) => ({
            dateTime:
              row.DateTime,

            admin:
              row.Admin,

            action:
              row.Action,

            details:
              row.Details,

            attachmentUrl:
              row.AttachmentURL,

            emailStatus:
              row.EmailStatus,

            requestId:
              row.RequestID,
          }))
          .sort(
            (a, b) =>
              new Date(
                b.dateTime
              ) -
              new Date(
                a.dateTime
              )
          )
          .slice(0, 500);


      res.json({
        success: true,
        data: logs,
      });

    } catch (error) {
      next(error);
    }
  }
);


export default router;