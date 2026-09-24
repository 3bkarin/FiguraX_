import { publicApi } from './api.js';
import { t, initLanguage, loadTranslations, translatePage, onLanguageChange, getLanguage, setLanguage } from './i18n.js';
import { getCartCount, onCartUpdate, addToCart } from './cart.js';
import { showToast, escapeHtml, formatCurrency, getQueryParam, sanitizeUrl, getPublicImageUrl, setupLanguageSwitcher, setupMobileMenu } from './common.js';

let currentProduct = null;
let currentImageIndex = 0;
let galleryImages = [];
let relatedProducts = [];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u0600-\u06FF]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

function normalizeSchema(schema) {
  if (!schema) return [];
  if (Array.isArray(schema)) return schema;
  if (typeof schema === 'string') {
    try {
      const parsed = JSON.parse(schema);
      return normalizeSchema(parsed);
    } catch {
      return [];
    }
  }
  if (schema.fields && Array.isArray(schema.fields)) return schema.fields;
  return [];
}

async function loadLanguage(lang) {
  try {
    const response = await fetch(`locales/${lang}.json`);
    const data = await response.json();
    loadTranslations(lang, data);
    translatePage();
  } catch (error) {
    console.error('Failed to load language:', error);
  }
}

async function init() {
  initLanguage();
  await loadLanguage(getLanguage());

  onLanguageChange(async (lang) => {
    await loadLanguage(lang);
    renderProduct();
  });

  setupLanguageSwitcher();
  setupMobileMenu();
  updateCartCount();
  onCartUpdate(updateCartCount);

  const productParam = getQueryParam('product');
  const productId = getQueryParam('id');

  if (productParam) {
    await loadProductBySlug(productParam);
  } else if (productId) {
    await loadProductById(productId);
  } else {
    showError();
  }
}

function updateCartCount() {
  const count = getCartCount();
  const el = document.getElementById('cartCount');
  if (el) {
    el.textContent = String(count);
    el.style.display = count > 0 ? 'flex' : 'none';
  }
}

async function loadProductById(id) {
  const container = document.getElementById('productDetail');
  container.innerHTML = `<div class="flex-center" style="padding:var(--spacing-xl);"><div class="spinner" aria-hidden="true"></div><p>${t('common.loading')}</p></div>`;

  try {
    const response = await publicApi.product(id);
    currentProduct = response?.data || null;
    await loadRelatedProducts();
    initializeGallery();
    renderProduct();
  } catch (error) {
    console.error('Failed to load product:', error);
    showError();
  }
}

async function loadProductBySlug(slug) {
  const response = await publicApi.products({ active: 'true', search: '' });
  const products = response?.data || [];
  const target = products.find(p => (p.slug || slugify(p.name)) === slug);
  if (!target) {
    showError();
    return;
  }
  currentProduct = target;
  await loadRelatedProducts();
  initializeGallery();
  renderProduct();
}

function initializeGallery() {
  galleryImages = [];
  if (currentProduct?.imageUrl) {
    galleryImages.push(currentProduct.imageUrl);
  }
  if (Array.isArray(currentProduct?.galleryUrls) && currentProduct.galleryUrls.length) {
    galleryImages.push(...currentProduct.galleryUrls);
  }
  if (!galleryImages.length) {
    galleryImages = [''];
  }
  currentImageIndex = 0;
}

async function loadRelatedProducts() {
  relatedProducts = [];
  try {
    const response = await publicApi.products({ active: 'true' });
    const products = (response?.data || []).filter(p => p.id !== currentProduct?.id && p.categoryName === currentProduct?.categoryName);
    relatedProducts = products.slice(0, 4);
  } catch {
    relatedProducts = [];
  }
}

function renderCustomizationForm() {
  const schema = normalizeSchema(currentProduct?.customizationSchema);
  if (!schema.length) return '';

  const currentLang = getLanguage();
  const title = currentProduct?.customizationTitle || (currentLang === 'ar' ? 'خيارات التخصيص' : 'Customization');
  const description = currentProduct?.customizationDescription || '';

  const fieldsHtml = schema.map((field, index) => {
    const id = field.id || field.name || `field_${index}`;
    const label = currentLang === 'ar' ? (field.labelAr || field.label || id) : (field.labelEn || field.label || id);
    const placeholder = currentLang === 'ar' ? (field.placeholderAr || field.placeholder || '') : (field.placeholderEn || field.placeholder || '');
    const required = field.required ? 'required' : '';
    const options = Array.isArray(field.options) ? field.options : [];
    const type = (field.type || 'text').toLowerCase();

    if (type === 'textarea') {
      return `
        <div class="form-group">
          <label class="form-label" for="custom_${id}">${escapeHtml(label)}${field.required ? ' *' : ''}</label>
          <textarea id="custom_${id}" name="custom_${id}" class="form-textarea" ${required} placeholder="${escapeHtml(placeholder)}"></textarea>
        </div>
      `;
    }

    if (type === 'select') {
      return `
        <div class="form-group">
          <label class="form-label" for="custom_${id}">${escapeHtml(label)}${field.required ? ' *' : ''}</label>
          <select id="custom_${id}" name="custom_${id}" class="form-select" ${required}>
            <option value="">${currentLang === 'ar' ? 'اختر' : 'Choose'}</option>
            ${options.map(opt => {
              const optLabel = typeof opt === 'string' ? opt : (currentLang === 'ar' ? opt.labelAr || opt.label || opt.value : opt.labelEn || opt.label || opt.value);
              const optValue = typeof opt === 'string' ? opt : (opt.value || optLabel);
              return `<option value="${escapeHtml(optValue)}">${escapeHtml(optLabel)}</option>`;
            }).join('')}
          </select>
        </div>
      `;
    }

    if (type === 'color') {
      return `
        <div class="form-group">
          <label class="form-label" for="custom_${id}">${escapeHtml(label)}${field.required ? ' *' : ''}</label>
          <input type="color" id="custom_${id}" name="custom_${id}" class="form-input" ${required} value="${field.default || '#ffffff'}">
        </div>
      `;
    }

    if (type === 'checkbox') {
      return `
        <div class="form-group">
          <label class="checkbox-pill" style="display:flex;align-items:center;gap:var(--spacing-sm);cursor:pointer;">
            <input type="checkbox" id="custom_${id}" name="custom_${id}" ${required}>
            <span>${escapeHtml(label)}${field.required ? ' *' : ''}</span>
          </label>
        </div>
      `;
    }

    return `
      <div class="form-group">
        <label class="form-label" for="custom_${id}">${escapeHtml(label)}${field.required ? ' *' : ''}</label>
        <input type="${escapeHtml(type === 'number' ? 'number' : 'text')}" id="custom_${id}" name="custom_${id}" class="form-input" ${required} placeholder="${escapeHtml(placeholder)}" min="${field.min ?? ''}" max="${field.max ?? ''}" step="${field.step ?? ''}">
      </div>
    `;
  }).join('');

  return `
    <section class="product-customization card" style="margin-top:var(--spacing-lg);">
      <div class="card-body">
        <h3 class="section-title" style="font-size:var(--font-size-lg);margin-bottom:var(--spacing-sm);">${escapeHtml(title)}</h3>
        ${description ? `<p class="card-text mb-md">${escapeHtml(description)}</p>` : ''}
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--spacing-md);">
          ${fieldsHtml}
        </div>
      </div>
    </section>
  `;
}

function renderPriceBlock(product) {
  const price = Number(product?.sellingPrice || 0);
  const original = Number(product?.originalPrice || 0);
  if (original && original > price) {
    const discount = Math.round((1 - price / original) * 100);
    return `
      <div class="product-price-block">
        <div class="product-detail-price">${formatCurrency(price)}</div>
        <div class="price-old">${formatCurrency(original)}</div>
        <span class="badge badge-warning">${t('product.sale') || `-${discount}%`}</span>
      </div>
    `;
  }
  return `<div class="product-detail-price">${formatCurrency(price)}</div>`;
}

function renderProduct() {
  if (!currentProduct) return;

  const container = document.getElementById('productDetail');
  const breadcrumbTitle = document.getElementById('breadcrumbTitle');

  document.title = `${currentProduct.name} - FIGURAX Store`;
  if (breadcrumbTitle) breadcrumbTitle.textContent = currentProduct.name;

  const mainImage = galleryImages[currentImageIndex] || '';

  container.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-detail-gallery">
        ${
          mainImage
            ? `<img id="mainImage" src="${getPublicImageUrl(mainImage)}" alt="${escapeHtml(currentProduct.name)}" class="product-detail-main-image">`
            : `<div class="product-detail-main-image placeholder"><i class="fa-solid fa-cube" aria-hidden="true"></i></div>`
        }
        ${
          galleryImages.length > 1
            ? `
              <div class="product-detail-thumbnails" role="group" aria-label="${t('product.gallery') || 'معرض الصور'}">
                ${galleryImages.map((img, idx) => `
                  <button type="button" class="product-detail-thumb ${idx === currentImageIndex ? 'active' : ''}" data-index="${idx}">
                    ${img ? `<img src="${getPublicImageUrl(img)}" alt="${escapeHtml(currentProduct.name)} ${idx + 1}">` : `<span>${idx + 1}</span>`}
                  </button>
                `).join('')}
              </div>
            `
            : ''
        }
      </div>

      <div class="product-detail-info card">
        <div class="card-body">
          <div class="flex-between gap-sm mb-sm">
            <span class="badge badge-primary">${escapeHtml(currentProduct.categoryName || '')}</span>
            ${currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.sellingPrice ? `<span class="badge badge-warning">${t('product.sale') || 'خصم'}</span>` : ''}
          </div>

          <h1 id="product-title" class="product-detail-title">${escapeHtml(currentProduct.name)}</h1>

          <div class="product-detail-meta">
            ${currentProduct.dimensions ? `<span><i class="fa-solid fa-ruler-combined" aria-hidden="true"></i> ${escapeHtml(currentProduct.dimensions)}</span>` : ''}
            ${currentProduct.weight ? `<span><i class="fa-solid fa-weight-scale" aria-hidden="true"></i> ${currentProduct.weight} جم</span>` : ''}
            ${currentProduct.infillPercent ? `<span><i class="fa-solid fa-percent" aria-hidden="true"></i> ${currentProduct.infillPercent}%</span>` : ''}
            ${currentProduct.material ? `<span><i class="fa-solid fa-box" aria-hidden="true"></i> ${escapeHtml(currentProduct.material)}</span>` : ''}
          </div>

          ${renderPriceBlock(currentProduct)}

          ${currentProduct.description ? `<div class="product-detail-description">${escapeHtml(currentProduct.description)}</div>` : ''}

          <div class="quantity-selector">
            <label for="quantityInput" class="form-label">${t('product.quantity')}</label>
            <button type="button" class="quantity-btn" id="decreaseQty" aria-label="${t('common.decrease') || 'إنقاص'}"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>
            <input type="number" id="quantityInput" class="quantity-input" value="1" min="1" max="99" aria-label="${t('product.quantity')}">
            <button type="button" class="quantity-btn" id="increaseQty" aria-label="${t('common.increase') || 'زيادة'}"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
          </div>

          ${renderCustomizationForm()}

          <div class="product-detail-actions">
            <button class="btn btn-primary btn-lg flex-1 add-to-cart">
              <i class="fa-solid fa-cart-plus" aria-hidden="true"></i>
              ${t('product.addToCart') || 'أضف إلى العربة'}
            </button>
            <a href="products.html" class="btn btn-secondary btn-lg">${t('common.back') || 'رجوع'}</a>
          </div>
        </div>
      </div>
    </div>

    ${
      relatedProducts.length
        ? `
          <section class="section mt-xl">
            <div class="container">
              <header class="section-header">
                <h2 class="section-title">${t('product.related') || 'منتجات مشابهة'}</h2>
              </header>
              <div class="grid grid-auto">
                ${relatedProducts.map(product => {
                  const href = `product.html?product=${encodeURIComponent(product.slug || slugify(product.name))}`;
                  return `
                    <article class="card product-card">
                      <a href="${href}">
                        ${product.imageUrl ? `<img src="${getPublicImageUrl(product.imageUrl)}" alt="${escapeHtml(product.name)}" class="card-image" loading="lazy">` : `<div class="card-image placeholder"><i class="fa-solid fa-cube" aria-hidden="true"></i></div>`}
                      </a>
                      <div class="card-body">
                        <h3 class="card-title">${escapeHtml(product.name)}</h3>
                        <div class="card-price">${formatCurrency(product.sellingPrice)}</div>
                        <a href="${href}" class="btn btn-secondary btn-sm">${t('product.viewDetails') || 'عرض التفاصيل'}</a>
                      </div>
                    </article>
                  `;
                }).join('')}
              </div>
            </div>
          </section>
        `
        : ''
    }
  `;

  setupGallery();
  setupQuantity();
  setupAddToCart();
}

function setupGallery() {
  const mainImage = document.getElementById('mainImage');
  const thumbnails = document.querySelectorAll('.product-detail-thumb');

  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const idx = parseInt(thumb.dataset.index, 10);
      currentImageIndex = idx;
      if (mainImage && galleryImages[idx]) {
        mainImage.src = getPublicImageUrl(galleryImages[idx]) || '';
        mainImage.alt = `${currentProduct.name} - ${t('product.image') || 'صورة'} ${idx + 1}`;
      }
      thumbnails.forEach(t => t.classList.toggle('active', t === thumb));
    });
  });
}

function setupQuantity() {
  const input = document.getElementById('quantityInput');
  const decrease = document.getElementById('decreaseQty');
  const increase = document.getElementById('increaseQty');

  if (decrease) {
    decrease.addEventListener('click', () => {
      const val = parseInt(input.value, 10) || 1;
      if (val > 1) input.value = val - 1;
    });
  }

  if (increase) {
    increase.addEventListener('click', () => {
      const val = parseInt(input.value, 10) || 1;
      if (val < 99) input.value = val + 1;
    });
  }

  if (input) {
    input.addEventListener('change', () => {
      let val = parseInt(input.value, 10) || 1;
      val = Math.max(1, Math.min(99, val));
      input.value = val;
    });
  }
}

function collectCustomizationData() {
  const schema = normalizeSchema(currentProduct?.customizationSchema);
  const customization = {};
  const noteParts = [];

  schema.forEach((field, index) => {
    const id = field.id || field.name || `field_${index}`;
    const el = document.getElementById(`custom_${id}`);
    if (!el) return;

    let value = '';
    if (el.type === 'checkbox') {
      value = el.checked;
    } else {
      value = String(el.value || '').trim();
    }

    customization[id] = value;
    if (value !== '' && value !== false) {
      noteParts.push(`${field.label || id}: ${value}`);
    }
  });

  return {
    customization,
    note: noteParts.join(' | '),
  };
}

function setupAddToCart() {
  const btn = document.querySelector('.add-to-cart');
  if (btn) {
    btn.addEventListener('click', () => {
      const quantity = parseInt(document.getElementById('quantityInput')?.value, 10) || 1;
      const { customization, note } = collectCustomizationData();
      addToCart(currentProduct, quantity, {
        options: customization,
        note,
        price: Number(currentProduct.sellingPrice || 0),
      });
      showToast(`${t('product.addedToCart') || 'تم إضافة المنتج إلى العربة'}`, 'success');
    });
  }
}

function showError() {
  const container = document.getElementById('productDetail');
  container.innerHTML = `
    <div class="text-center" style="padding:var(--spacing-xl);">
      <i class="fa-solid fa-triangle-exclamation" style="font-size:4rem;color:var(--color-error);margin-bottom:var(--spacing-md);" aria-hidden="true"></i>
      <h3>${t('common.notFound') || 'المنتج غير موجود'}</h3>
      <p>${t('common.productNotFound') || 'المنتج الذي تبحث عنه غير موجود أو تمت إزالته.'}</p>
      <a href="products.html" class="btn btn-primary mt-md">${t('common.backToProducts') || 'العودة للمنتجات'}</a>
    </div>
  `;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
