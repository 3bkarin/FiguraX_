import { publicApi } from './api.js';
import { config } from './config.js';

import {
  t,
  initLanguage,
  loadTranslations,
  translatePage,
  onLanguageChange,
  getLanguage,
} from './i18n.js';

import {
  getCart,
  getCartCount,
  getCartTotal,
  clearCart,
  onCartUpdate,
} from './cart.js';

import {
  generateIdempotencyKey,
  showToast,
  escapeHtml,
  formatCurrency,
  sanitizeUrl,
  setupLanguageSwitcher,
  setupMobileMenu,
} from './common.js';

let settings = {};
let governorates = [];
let shippingFee = 0;
let checkoutSubmitting = false;

const DEFAULT_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'الغربية',
  'الدقهلية',
  'الشرقية',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'شمال سيناء',
  'جنوب سيناء',
  'البحر الأحمر',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'الوادي الجديد',
  'مطروح',
];

async function loadLanguage(lang) {
  try {
    const response = await fetch(`locales/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load language file: ${response.status}`);
    }
    const data = await response.json();
    loadTranslations(lang, data);
    translatePage();
    renderOrderSummary();
    renderGovernorates();
    updatePaymentMethodText();
  } catch (error) {
    console.error('Failed to load language:', error);
  }
}

async function init() {
  try {
    initLanguage();

    await loadLanguage(getLanguage());

    onLanguageChange(async (lang) => {
      await loadLanguage(lang);
      renderOrderSummary();
      renderGovernorates();
      updatePaymentMethodText();
    });

    setupLanguageSwitcher();
    setupMobileMenu();

    updateCartCount();

    onCartUpdate(() => {
      updateCartCount();
      renderOrderSummary();
    });

    await Promise.all([
      loadSettings(),
      loadGovernorates(),
    ]);

    renderOrderSummary();
    setupPaymentMethodToggle();
    setupGovernorateChange();
    setupForm();
    updatePaymentMethodText();

    console.log('✅ Checkout initialized');
  } catch (error) {
    console.error('❌ Checkout initialization failed:', error);
    showToast(error?.message || 'حدث خطأ في تحميل صفحة الطلب', 'error');
  }
}

function updateCartCount() {
  const elements = document.querySelectorAll('[data-cart-count]');
  const count = getCartCount();

  elements.forEach((element) => {
    element.textContent = String(count);
  });
}

async function loadSettings() {
  try {
    const response = await publicApi.settings();
    settings = response?.data || {};
  } catch (error) {
    console.error('Failed to load settings:', error);
    settings = {};
  }
}

async function loadGovernorates() {
  governorates = [...DEFAULT_GOVERNORATES];
  renderGovernorates();
}

function renderGovernorates() {
  const select = document.getElementById('governorate');
  if (!select) return;

  const currentValue = select.value;

  select.innerHTML = `
    <option value="" disabled ${!currentValue ? 'selected' : ''} data-i18n="checkout.selectGovernorate">
      ${escapeHtml(t('checkout.selectGovernorate') || 'اختار المحافظة')}
    </option>
    ${governorates
      .map(
        (gov) => `
          <option value="${escapeHtml(gov)}" ${gov === currentValue ? 'selected' : ''}>${escapeHtml(gov)}</option>
        `
      )
      .join('')}
  `;
}

async function loadShippingForGovernorate(governorate) {
  if (!governorate) {
    shippingFee = 0;
    renderOrderSummary();
    return;
  }

  const select = document.getElementById('governorate');
  if (select) {
    select.disabled = true;
  }

  try {
    const response = await publicApi.shipping(governorate);
    const data = response?.data ?? response;

    const fee = Number(
      data?.shippingFee ??
        data?.fee ??
        data?.shipping ??
        data?.rate ??
        0
    );

    shippingFee = Number.isFinite(fee) ? fee : 0;
    renderOrderSummary();
  } catch (error) {
    console.error('Failed to load shipping rate:', error);
    shippingFee = 0;
    renderOrderSummary();
    showToast(error?.message || 'تعذر تحميل سعر الشحن', 'error');
  } finally {
    if (select) {
      select.disabled = false;
    }
  }
}

function setupGovernorateChange() {
  const select = document.getElementById('governorate');
  if (!select || select.dataset.shippingListener === 'true') return;

  select.dataset.shippingListener = 'true';

  select.addEventListener('change', async () => {
    await loadShippingForGovernorate(select.value);
  });

  if (select.value) {
    loadShippingForGovernorate(select.value);
  }
}

function getProductImageUrl(imageUrl) {
  if (!imageUrl) return '';
  const value = String(imageUrl).trim();
  if (!value) return '';

  if (value.includes('/api/products/image/')) {
    return value;
  }

  const drivePatterns = [
    /\/d\/([^/]+)/,
    /[?&]id=([^&]+)/,
  ];

  for (const pattern of drivePatterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return `${publicApiBaseUrl()}/products/image/${encodeURIComponent(match[1])}`;
    }
  }

  return sanitizeUrl(value);
}

function publicApiBaseUrl() {
  return config.apiBase;
}

function renderOrderSummary() {
  const container = document.getElementById('orderSummary');
  if (!container) return;

  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-cart">
        ${escapeHtml(t('checkout.emptyCart') || 'السلة فارغة')}
      </div>
    `;
    return;
  }

  const subtotal = Number(getCartTotal()) || 0;
  const shipping = Number(shippingFee) || 0;
  const total = subtotal + shipping;

  container.innerHTML = `
    <div class="order-items">
      ${cart
        .map((item) => {
          const image = getProductImageUrl(item.imageUrl);
          const price = Number(item.price ?? item.sellingPrice ?? 0);
          const quantity = Number(item.quantity ?? 1);
          const options = item.options ? Object.entries(item.options).map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v))}`).join('<br>') : '';

          return `
            <div class="order-item">
              ${
                image
                  ? `<div class="order-item-image">
                      <img src="${escapeHtml(image)}" alt="${escapeHtml(item.name || '')}" loading="lazy">
                    </div>`
                  : ''
              }
              <div class="order-item-info">
                <div class="order-item-name">${escapeHtml(item.name || '')}</div>
                <div class="order-item-meta">${escapeHtml(String(quantity))} × ${formatCurrency(price)}</div>
                ${options ? `<div class="order-item-options" style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin-top:var(--spacing-xs);">${options}</div>` : ''}
              </div>
              <div class="order-item-total">${formatCurrency(price * quantity)}</div>
            </div>
          `;
        })
        .join('')}
    </div>

    <div class="order-summary-row">
      <span>${escapeHtml(t('checkout.subtotal') || 'Subtotal')}</span>
      <strong>${formatCurrency(subtotal)}</strong>
    </div>

    <div class="order-summary-row">
      <span>${escapeHtml(t('checkout.shipping') || 'Shipping')}</span>
      <strong>${formatCurrency(shipping)}</strong>
    </div>

    <div class="order-summary-row total">
      <span>${escapeHtml(t('checkout.total') || 'Total')}</span>
      <strong>${formatCurrency(total)}</strong>
    </div>
  `;
}

function setupPaymentMethodToggle() {
  const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
  const instapayInfo = document.getElementById('instapayInfo');

  if (!paymentRadios.length) {
    console.warn('⚠️ No payment method radios found');
    return;
  }

  function toggleInstapay() {
    const selected = document.querySelector('input[name="paymentMethod"]:checked');
    const selectedValue = String(selected?.value || '').toLowerCase();
    const isInstapay = selectedValue === 'instapay' || selectedValue.includes('instapay');

    if (instapayInfo) {
      instapayInfo.hidden = !isInstapay;
    }

    if (isInstapay && settings.instapayUsername) {
      const usernameDisplay = document.getElementById('instapayUsernameDisplay');
      const linkDisplay = document.getElementById('instapayLinkDisplay');
      if (usernameDisplay) {
        usernameDisplay.textContent = settings.instapayUsername;
      }
      if (linkDisplay) {
        const safeLink = sanitizeUrl(settings.instapayLink);
        linkDisplay.href = safeLink || '#';
        linkDisplay.textContent = settings.instapayLink || t('checkout.payNow') || 'الدفع الآن';
      }
    }
  }

  paymentRadios.forEach((radio) => {
    radio.addEventListener('change', toggleInstapay);
    radio.addEventListener('click', toggleInstapay);
  });

  const alreadySelected = Array.from(paymentRadios).some((radio) => radio.checked);
  if (!alreadySelected) {
    const cashRadio = document.querySelector('input[name="paymentMethod"][value="cash_on_delivery"]');
    if (cashRadio) {
      cashRadio.checked = true;
    }
  }

  toggleInstapay();
}

function updatePaymentMethodText() {
  const selected = document.querySelector('input[name="paymentMethod"]:checked');
  const instapayInfo = document.getElementById('instapayInfo');

  if (!selected) {
    if (instapayInfo) instapayInfo.hidden = true;
    return;
  }

  const value = String(selected.value || '').toLowerCase();
  const isInstapay = value === 'instapay' || value.includes('instapay');

  if (instapayInfo) {
    instapayInfo.hidden = !isInstapay;
  }
}


function normalizeLocationUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function buildCustomizationSummary(cartItem) {
  if (!cartItem?.options) return '';
  const entries = Object.entries(cartItem.options).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false);
  if (!entries.length) return '';
  return entries.map(([k, v]) => `${k}: ${v}`).join(' | ');
}

function setupForm() {
  const form = document.getElementById('checkoutForm');
  const submitBtn = document.getElementById('submitBtn');

  if (!form) {
    console.error('❌ Checkout form not found: #checkoutForm');
    return;
  }

  form.noValidate = true;

  if (submitBtn) {
    submitBtn.type = 'submit';
  }

  if (form.dataset.submitListener === 'true') {
    return;
  }
  form.dataset.submitListener = 'true';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (checkoutSubmitting) return;

    console.log('🟢 Checkout submit triggered');

    const validation = validateForm();
    console.log('🔎 Checkout validation result:', validation);

    if (!validation.valid) {
      console.warn('⚠️ Checkout validation failed:', validation.errors);
      showToast(validation.errors.join(' — ') || 'Please complete all required fields', 'error');
      return;
    }

    const cart = getCart();
    if (!cart.length) {
      showToast(t('checkout.emptyCart') || 'السلة فارغة', 'error');
      return;
    }

    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
    if (!selectedPayment) {
      showToast('اختار طريقة الدفع أولاً', 'error');
      return;
    }

    checkoutSubmitting = true;
    setLoading(true);

    try {
      const idempotencyKey = generateIdempotencyKey();
      const formData = new FormData(form);
      const paymentMethod = selectedPayment.value;
      const genderValue = formData.get('gender');

      const customizationNotes = cart
        .map(item => buildCustomizationSummary(item))
        .filter(Boolean)
        .join('\n');

      const customerNotes = String(formData.get('notes') || '').trim();
      const combinedNotes = [customerNotes, customizationNotes].filter(Boolean).join('\n\n');

      const orderData = {
        customer: {
          name: String(formData.get('fullName') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          gender: String(genderValue || '').trim(),
          phone: String(formData.get('phone') || '').trim(),
          governorate: String(formData.get('governorate') || '').trim(),
          address: String(formData.get('address') || '').trim(),
          locationUrl: normalizeLocationUrl(formData.get('locationUrl')),
        },
        paymentMethod,
        notes: combinedNotes,
        platform: 'website',
        language: getLanguage(),
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity) || 1,
          options: item.options || {},
          note: item.note || '',
        })),
      };

      console.log('📦 Sending order:', orderData);

      const response = await publicApi.createOrder(orderData, idempotencyKey);

      console.log('✅ Order response:', response);

      if (response?.duplicate) {
        showToast(
          t('checkout.orderAlreadySubmitted') || 'الطلب تم تسجيله بالفعل',
          'success'
        );
        return;
      }

      const order = response?.data ?? response;

      if (!order || !order.orderId) {
        throw new Error('تم إرسال الطلب ولكن لم يتم استلام رقم الطلب من الخادم');
      }

      clearCart();
      updateCartCount();
      const successUrl = new URL('order-success.html', window.location.href);
      successUrl.searchParams.set('order', order.orderId);
      successUrl.searchParams.set('total', String(order.total ?? 0));
      window.location.href = successUrl.toString();
    } catch (error) {
      console.error('❌ Order failed:', error);
      showToast(error?.message || 'حدث خطأ أثناء تسجيل الطلب', 'error');
    } finally {
      checkoutSubmitting = false;
      setLoading(false);
    }
  });

  form.querySelectorAll('input, select, textarea').forEach((input) => {
    input.addEventListener('input', () => clearFieldError(input));
    input.addEventListener('change', () => clearFieldError(input));
  });
}

function validateForm() {
  const form = document.getElementById('checkoutForm');
  if (!form) {
    return { valid: false, errors: ['Checkout form not found'] };
  }

  const errors = [];

  const fullName = document.getElementById('fullName');
  const email = document.getElementById('email');
  const gender = document.getElementById('gender');
  const phone = document.getElementById('phone');
  const governorate = document.getElementById('governorate');
  const address = document.getElementById('address');
  const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked');

  if (!fullName || !fullName.value.trim()) {
    setFieldError(fullName, 'الاسم مطلوب');
    errors.push('الاسم');
  }

  if (!email || !email.value.trim()) {
    setFieldError(email, 'البريد الإلكتروني مطلوب');
    errors.push('البريد الإلكتروني');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    setFieldError(email, 'البريد الإلكتروني غير صحيح');
    errors.push('البريد الإلكتروني غير صحيح');
  }

  if (!gender || !String(gender.value || '').trim()) {
    setFieldError(gender, 'اختار النوع');
    errors.push('النوع');
  }

  if (!phone || !phone.value.trim()) {
    setFieldError(phone, 'رقم الهاتف مطلوب');
    errors.push('رقم الهاتف');
  } else if (!/^01\d{9}$/.test(phone.value.trim())) {
    setFieldError(phone, 'رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 01');
    errors.push('رقم الهاتف غير صحيح');
  }

  if (!governorate || !governorate.value) {
    setFieldError(governorate, 'اختار المحافظة');
    errors.push('المحافظة');
  }

  if (!address || !address.value.trim()) {
    setFieldError(address, 'العنوان مطلوب');
    errors.push('العنوان');
  }

  if (!paymentMethod) {
    const paymentInput = form.querySelector('input[name="paymentMethod"]');
    setFieldError(paymentInput, 'اختار طريقة الدفع');
    errors.push('طريقة الدفع');
  }

  return { valid: errors.length === 0, errors };
}

function getErrorElement(input) {
  if (!input) return null;
  const field = input.closest('.form-group, .field, .input-group, .form-field');
  if (!field) return null;
  return field.querySelector('.field-error, .form-error, [data-field-error]');
}

function setFieldError(input, message) {
  if (!input) return;
  input.classList.add('error');
  const errorElement = getErrorElement(input);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.hidden = false;
  }
}

function clearFieldError(input) {
  if (!input) return;
  input.classList.remove('error');
  const errorElement = getErrorElement(input);
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.hidden = true;
  }
}

function setLoading(loading) {
  const submitBtn = document.getElementById('submitBtn');
  if (!submitBtn) return;

  submitBtn.disabled = loading;

  if (loading) {
    if (!submitBtn.dataset.originalText) {
      submitBtn.dataset.originalText = submitBtn.textContent;
    }
    submitBtn.textContent = t('checkout.processing') || 'جاري تسجيل الطلب...';
  } else {
    submitBtn.textContent = submitBtn.dataset.originalText || t('checkout.confirmOrder') || 'تأكيد الطلب';
  }
}

function showSuccessModal(order, paymentMethod) {
  const orderId = order.orderId || order.id || '';
  const total = Number(order.total ?? order.totalPrice ?? 0) || (Number(order.subtotal || 0) + Number(order.shipping || 0));
  const emailSent = order.emailSent !== false;

  const existing = document.getElementById('orderSuccessModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'orderSuccessModal';
  modal.className = 'modal order-success-modal';

  modal.innerHTML = `
    <div class="modal-content">
      <button type="button" class="modal-close" aria-label="Close">×</button>
      <div class="success-icon">✓</div>
      <h2>${escapeHtml(t('checkout.orderSuccess') || 'تم تسجيل الطلب بنجاح')}</h2>
      <p>${escapeHtml(t('checkout.orderNumber') || 'رقم الطلب')}: <strong>${escapeHtml(String(orderId))}</strong></p>
      <p>${escapeHtml(t('checkout.total') || 'الإجمالي')}: <strong>${formatCurrency(total)}</strong></p>
      ${
        String(paymentMethod).toLowerCase().includes('instapay')
          ? `
            <div class="instapay-success-info">
              ${
                settings.instapayUsername
                  ? `<p>InstaPay: <strong>${escapeHtml(settings.instapayUsername)}</strong></p>`
                  : ''
              }
              ${
                settings.instapayLink
                  ? `<a href="${escapeHtml(sanitizeUrl(settings.instapayLink) || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('checkout.payNow') || 'الدفع الآن')}</a>`
                  : ''
              }
            </div>
          `
          : ''
      }
      <button type="button" class="btn primary success-close-btn">${escapeHtml(t('common.close') || 'إغلاق')}</button>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();

  modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('.success-close-btn')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  requestAnimationFrame(() => modal.classList.add('show'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
