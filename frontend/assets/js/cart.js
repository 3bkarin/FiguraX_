const CART_KEY = 'figurax_cart';
const CART_VERSION = 2;

function safeParseCart(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeVariantKey(product, options = {}) {
  const payload = {
    productId: product?.id || product?.productId || '',
    options: options?.customization || options?.options || options?.note || '',
  };
  return `${payload.productId}::${JSON.stringify(payload.options)}`;
}

function normalizePrice(product, options = {}) {
  const salePrice = Number(
    options.price ??
      options.unitPrice ??
      product?.sellingPrice ??
      product?.price ??
      0
  ) || 0;

  return salePrice;
}

export function getCart() {
  try {
    const data = localStorage.getItem(CART_KEY);
    const cart = safeParseCart(data);
    return cart.map((item) => ({
      ...item,
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Number(item.price) || 0,
      originalPrice: item.originalPrice !== undefined ? Number(item.originalPrice) || 0 : undefined,
      options: item.options || {},
      variantKey: item.variantKey || makeVariantKey(item, item.options || {}),
    }));
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
}

export function addToCart(product, quantity = 1, options = {}) {
  const cart = getCart();
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const variantKey = makeVariantKey(product, options);
  const price = normalizePrice(product, options);

  const existingIndex = cart.findIndex(item => item.variantKey === variantKey);

  const newItem = {
    productId: product.id,
    name: product.name,
    slug: product.slug || '',
    price,
    originalPrice: Number(product.originalPrice || product.sellingPrice || price) || price,
    imageUrl: product.imageUrl,
    quantity: qty,
    options: options.customization || options.options || {},
    note: options.note || '',
    variantKey,
    categoryName: product.categoryName || '',
  };

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += qty;
    cart[existingIndex].price = price || cart[existingIndex].price;
    cart[existingIndex].originalPrice =
      Number(product.originalPrice || cart[existingIndex].originalPrice || cart[existingIndex].price) || cart[existingIndex].price;
    cart[existingIndex].options = {
      ...(cart[existingIndex].options || {}),
      ...(newItem.options || {}),
    };
    if (newItem.note) {
      cart[existingIndex].note = [cart[existingIndex].note, newItem.note].filter(Boolean).join('\n');
    }
  } else {
    cart.push(newItem);
  }

  saveCart(cart);
  return cart;
}

export function removeFromCart(productId, variantKey = null) {
  const cart = getCart().filter(item => {
    if (variantKey) {
      return item.variantKey !== variantKey;
    }
    return item.productId !== productId;
  });
  saveCart(cart);
  return cart;
}

export function updateQuantity(productId, quantity, variantKey = null) {
  const cart = getCart();
  const item = cart.find(i => (variantKey ? i.variantKey === variantKey : i.productId === productId));
  if (item) {
    item.quantity = Math.max(1, parseInt(quantity, 10) || 1);
    saveCart(cart);
  }
  return cart;
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: [] }));
}

export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotal() {
  return getCart().reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
}

export function onCartUpdate(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener('cart:updated', handler);
  return () => window.removeEventListener('cart:updated', handler);
}

export function cartHasVariant(productId, variantKey) {
  return getCart().some(item => item.productId === productId && item.variantKey === variantKey);
}
