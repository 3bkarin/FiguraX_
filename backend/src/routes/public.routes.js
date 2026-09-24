import express from 'express';
import { getPublicSettings } from '../services/settings.service.js';
import {
  getProducts,
  getProductById,
  getCategories,
  getCategoryByName
} from '../services/product.service.js';
import { getShippingRate } from '../services/shipping.service.js';
import { getReviews, getReviewRequest, submitCustomerReview } from '../services/review.service.js';
import {
  validateRequest,
  orderRateLimit
} from '../middleware/index.js';
import { orderValidator } from '../validators/index.js';
import { createOrder } from '../services/order.service.js';
import {
  checkIdempotency,
  storeIdempotency,
  withIdempotencyLock
} from '../services/idempotency.service.js';

import { downloadPublicFile } from '../services/drive.service.js';

const router = express.Router();

/* =========================
   HEALTH
========================= */

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
});

/* =========================
   SETTINGS
========================= */

router.get('/settings', async (req, res, next) => {
  try {
    const settings = await getPublicSettings();

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
});

/* =========================
   CATEGORIES
========================= */

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await getCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

/* =========================
   PRODUCT IMAGE PROXY
   =========================
   مهم:
   لازم يتحط قبل /products/:id
   علشان image ما تتفسرش كـ product id.
========================= */

router.get('/products/image/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_ID',
          message: 'File ID is required'
        }
      });
    }

    const result = await downloadPublicFile(fileId);

    if (!result || !result.data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: 'Product image not found'
        }
      });
    }

    res.setHeader(
      'Content-Type',
      result.mimeType || 'application/octet-stream'
    );

    res.setHeader(
      'Content-Disposition',
      'inline'
    );

    /*
     * الصور ممكن تتكاش لمدة يوم.
     * ده يقلل طلبات Drive المتكررة.
     */
    res.setHeader(
      'Cache-Control',
      'public, max-age=86400, immutable'
    );

    /*
     * مهم مع Helmet / Cross-Origin Resource Policy
     */
    res.setHeader(
      'Cross-Origin-Resource-Policy',
      'cross-origin'
    );

    if (typeof result.data.pipe === 'function') {
      return result.data.pipe(res);
    }

    return res.send(result.data);

  } catch (error) {
    next(error);
  }
});

/* =========================
   PRODUCTS
========================= */

router.get('/products', async (req, res, next) => {
  try {
    const {
      category,
      search,
      active
    } = req.query;

    const products = await getProducts({
      category,
      search,
      activeOnly: active !== 'false'
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

/* =========================
   SHIPPING
========================= */

router.get('/shipping', async (req, res, next) => {
  try {
    const { governorate } = req.query;

    if (!governorate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Governorate is required'
        }
      });
    }

    const fee = await getShippingRate(governorate);

    res.json({
      success: true,
      data: {
        governorate,
        fee
      }
    });
  } catch (error) {
    next(error);
  }
});

/* =========================
   REVIEWS
========================= */

router.get('/reviews/request', async (req, res, next) => {
  try {
    const data = await getReviewRequest(req.query.token);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'INVALID_REVIEW_LINK', message: error.message } });
  }
});

router.post('/reviews/submit', orderRateLimit, async (req, res, next) => {
  try {
    const result = await submitCustomerReview(req.body.token, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'REVIEW_SUBMISSION_FAILED', message: error.message } });
  }
});

router.get('/reviews', async (req, res, next) => {
  try {
    const reviews = await getReviews(true);

    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
});

/* =========================
   ORDERS
========================= */

router.post(
  '/orders',
  orderRateLimit,
  orderValidator,
  validateRequest,
  async (req, res, next) => {
    try {
      const idempotencyKey =
        req.headers['idempotency-key'] ||
        req.body.idempotencyKey;

      if (!idempotencyKey) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Idempotency key is required'
          }
        });
      }

      const result = await withIdempotencyLock(
        idempotencyKey,
        async () => {
          const existing =
            await checkIdempotency(idempotencyKey);

          if (existing.exists) {
            return {
              duplicate: true,
              response: existing.response
            };
          }

          const orderResult =
            await createOrder(req.body);

          const response = {
            success: true,
            data: orderResult
          };

          await storeIdempotency(
            idempotencyKey,
            response
          );

          return {
            duplicate: false,
            response
          };
        }
      );

      if (result.duplicate) {
        return res.json({
          ...result.response,
          duplicate: true
        });
      }

      res.status(201).json(result.response);

    } catch (error) {
      next(error);
    }
  }
);

export default router;