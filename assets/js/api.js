import { config } from './config.js';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  constructor() {
    this.baseUrl = config.apiBase.replace(/\/$/, '');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {}),
      },
    };

    const response = await fetch(url, mergedOptions);

    let data = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      throw new ApiError(
        data?.error?.message || data?.message || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body, idempotencyKey) {
    const headers = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

export const publicApi = {
  health: () => api.get('/health'),
  settings: () => api.get('/settings'),
  categories: () => api.get('/categories'),
  products: (params = {}) => {
    const search = new URLSearchParams(params).toString();
    return api.get(search ? `/products?${search}` : '/products');
  },
  product: (id) => api.get(`/products/${encodeURIComponent(id)}`),
  shipping: (governorate) =>
    api.get(`/shipping?governorate=${encodeURIComponent(governorate)}`),
  reviews: () => api.get('/reviews'),
  reviewRequest: (token) => api.get(`/reviews/request?token=${encodeURIComponent(token)}`),
  submitReview: (data) => api.post('/reviews/submit', data),
  createOrder: (orderData, idempotencyKey) =>
    api.post('/orders', orderData, idempotencyKey),
};

export const authApi = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout', {}),
  me: () => api.get('/auth/me'),
};

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),

  categories: {
    list: () => api.get('/admin/categories'),
    create: (data) => api.post('/admin/categories', data),
    update: (id, data) => api.patch(`/admin/categories/${encodeURIComponent(id)}`, data),
    delete: (id) => api.delete(`/admin/categories/${encodeURIComponent(id)}`),
  },

  products: {
    list: () => api.get('/admin/products'),
    get: (id) => api.get(`/admin/products/${encodeURIComponent(id)}`),
    create: (data) => api.post('/admin/products', data),
    update: (id, data) => api.patch(`/admin/products/${encodeURIComponent(id)}`, data),
    delete: (id) => api.delete(`/admin/products/${encodeURIComponent(id)}`),
    uploadImage: async ({ base64Image, fileName, folderType = 'PRODUCTS' }) => {
      const response = await api.post('/admin/products/upload-image', {
        base64Image,
        fileName,
        imageFileName: fileName,
        folderType,
      });
      return response?.data?.url || response?.data?.imageUrl || response?.url || null;
    },
  },

  orders: {
    list: () => api.get('/admin/orders?fresh=1'),
    create: (data) => api.post('/admin/orders', data),
    get: (id) => api.get(`/admin/orders/${encodeURIComponent(id)}`),
    updateStatus: (id, data) =>
      api.patch(`/admin/orders/${encodeURIComponent(id)}/status`, data),
  },

  fund: {
    list: (params = {}) => {
      const search = new URLSearchParams(params).toString();
      return api.get(search ? `/admin/fund?${search}` : '/admin/fund');
    },
    get: (id) => api.get(`/admin/fund/${encodeURIComponent(id)}`),
    create: (data) => api.post('/admin/fund', data),
    update: (id, data) => api.patch(`/admin/fund/${encodeURIComponent(id)}`, data),
  },

  analysis: () => api.get('/admin/analysis'),

  reviews: {
    list: () => api.get('/admin/reviews'),
    create: (data) => api.post('/admin/reviews', data),
    update: (id, data) => api.patch(`/admin/reviews/${encodeURIComponent(id)}`, data),
    delete: (id) => api.delete(`/admin/reviews/${encodeURIComponent(id)}`),
  },

  settings: {
    get: () => api.get('/admin/settings'),
    update: (data) => api.patch('/admin/settings', data),
  },

  shipping: {
    list: () => api.get('/admin/shipping'),
    update: (governorate, fee) =>
      api.patch(`/admin/shipping/${encodeURIComponent(governorate)}`, { fee }),
    delete: (governorate) =>
      api.delete(`/admin/shipping/${encodeURIComponent(governorate)}`),
  },

  activityLogs: () => api.get('/admin/activity-logs'),
};

export default api;
