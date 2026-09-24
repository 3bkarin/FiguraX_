import { publicApi } from './api.js';
import { t, initLanguage, loadTranslations, translatePage, onLanguageChange, getLanguage, setLanguage } from './i18n.js';
import { getCartCount, onCartUpdate, addToCart } from './cart.js';
import { showToast, escapeHtml, formatCurrency, sanitizeUrl, getPublicImageUrl, getWhatsAppUrl, setupLanguageSwitcher, setupMobileMenu } from './common.js';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u0600-\u06FF]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
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
    await renderAll();
  });

  setupLanguageSwitcher();
  setupMobileMenu();
  updateCartCount();
  onCartUpdate(updateCartCount);

  await renderAll();
}

async function renderAll() {
  await Promise.all([
    loadCategories(),
    loadFeaturedProducts(),
    loadReviews(),
    loadSocialLinks(),
  ]);
}

function updateCartCount() {
  const count = getCartCount();
  const el = document.getElementById('cartCount');
  if (el) {
    el.textContent = String(count);
    el.style.display = count > 0 ? 'flex' : 'none';
  }
}

async function loadCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  grid.innerHTML = `<div class="flex-center" style="grid-column:1/-1;padding:var(--spacing-xl)"><div class="spinner"></div><p>${t('common.loading')}</p></div>`;

  try {
    const response = await publicApi.categories();
    const categories = response?.data || [];

    if (!categories.length) {
      grid.innerHTML = `<p class="text-center" style="grid-column:1/-1">${t('common.noCategories') || 'لا توجد تصنيفات متاحة'}</p>`;
      return;
    }

    grid.innerHTML = categories.map(cat => `
      <article class="card card-hover" role="listitem">
        <a href="products.html?category=${encodeURIComponent(cat.name)}" class="card-link" style="text-decoration:none;color:inherit;display:block;height:100%;">
          <div class="card-body flex-center" style="min-height:150px;">
            <div class="text-center">
              <i class="fa-solid fa-layer-group" style="font-size:3rem;color:var(--color-primary);margin-bottom:var(--spacing-md);" aria-hidden="true"></i>
              <h3 class="card-title">${escapeHtml(cat.name)}</h3>
              <p class="card-text">${cat.productCount || 0} ${t('product.products') || 'منتج'}</p>
            </div>
          </div>
        </a>
      </article>
    `).join('');
  } catch (error) {
    console.error('Failed to load categories:', error);
    grid.innerHTML = `<p class="text-center" style="grid-column:1/-1;color:var(--color-error)">${t('common.error')}</p>`;
  }
}

function renderPrice(product) {
  const price = Number(product?.sellingPrice || 0);
  const original = Number(product?.originalPrice || 0);
  if (original && original > price) {
    const discount = Math.round((1 - price / original) * 100);
    return `
      <div class="product-price-block">
        <div class="price-main">${formatCurrency(price)}</div>
        <div class="price-old">${formatCurrency(original)}</div>
        <span class="badge badge-warning">${t('product.sale') || `-${discount}%`}</span>
      </div>
    `;
  }
  return `<div class="card-price">${formatCurrency(price)}</div>`;
}

async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  grid.innerHTML = `<div class="flex-center" style="grid-column:1/-1;padding:var(--spacing-xl)"><div class="spinner"></div><p>${t('common.loading')}</p></div>`;

  try {
    const response = await publicApi.products({ active: 'true' });
    const products = (response?.data || []).filter(p => p.active !== false).slice(0, 8);

    if (!products.length) {
      grid.innerHTML = `<p class="text-center" style="grid-column:1/-1">${t('common.noProducts') || 'لا توجد منتجات متاحة'}</p>`;
      return;
    }

    grid.innerHTML = products.map(product => {
      const href = `product.html?product=${encodeURIComponent(product.slug || slugify(product.name))}`;
      return `
        <article class="card product-card" role="listitem">
          <a href="${href}" class="card-image-link">
            ${
              product.imageUrl
                ? `<img src="${getPublicImageUrl(product.imageUrl)}" alt="${escapeHtml(product.name)}" class="card-image" loading="lazy">`
                : `<div class="card-image placeholder"><i class="fa-solid fa-cube" aria-hidden="true"></i></div>`
            }
          </a>
          <div class="card-body">
            <div class="flex-between gap-sm mb-sm">
              <span class="badge badge-primary">${escapeHtml(product.categoryName || '')}</span>
              ${product.originalPrice && product.originalPrice > product.sellingPrice ? `<span class="badge badge-warning">${t('product.sale') || 'خصم'}</span>` : ''}
            </div>
            <h3 class="card-title">${escapeHtml(product.name)}</h3>
            ${renderPrice(product)}
            <div class="product-card-actions">
              <a href="${href}" class="btn btn-secondary btn-sm flex-1">${t('product.viewDetails') || 'عرض التفاصيل'}</a>
              <button class="btn btn-primary btn-sm flex-1 add-to-cart" data-product-id="${escapeHtml(product.id)}" data-product-slug="${escapeHtml(product.slug || slugify(product.name))}">
                <i class="fa-solid fa-cart-plus" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const productId = btn.dataset.productId;
        const product = products.find(p => p.id === productId);
        if (product) {
          addToCart(product, 1);
          showToast(t('product.addedToCart') || 'تم إضافة المنتج إلى العربة', 'success');
        }
      });
    });
  } catch (error) {
    console.error('Failed to load featured products:', error);
    grid.innerHTML = `<p class="text-center" style="grid-column:1/-1;color:var(--color-error)">${t('common.error')}</p>`;
  }
}

async function loadReviews() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  grid.innerHTML = `<div class="flex-center" style="grid-column:1/-1;padding:var(--spacing-xl)"><div class="spinner"></div><p>${t('common.loading')}</p></div>`;

  try {
    const response = await publicApi.reviews();
    const reviews = (response?.data || []).filter(r => r.approved !== false).slice(0, 6);

    if (!reviews.length) {
      grid.innerHTML = `<p class="text-center" style="grid-column:1/-1">${t('common.noReviews') || 'لا توجد تقييمات بعد'}</p>`;
      return;
    }

    grid.innerHTML = reviews.map(review => `
      <article class="card" role="listitem">
        <div class="card-body">
          <div class="flex-between mb-sm">
            <strong>${escapeHtml(review.customerName)}</strong>
            <div class="text-warning" aria-label="${review.rating}">${'★'.repeat(Number(review.rating) || 0)}</div>
          </div>
          ${
            review.contentType === 'image' && review.content
              ? `<img src="${getPublicImageUrl(review.content)}" alt="${escapeHtml(review.customerName)}" class="card-image" style="max-height:200px;object-fit:cover;border-radius:var(--border-radius-md);">`
              : `<p class="card-text">${escapeHtml(review.content || review.textContent || '')}</p>`
          }
        </div>
      </article>
    `).join('');
  } catch (error) {
    console.error('Failed to load reviews:', error);
    grid.innerHTML = '';
  }
}

async function loadSocialLinks() {
  const [grid, footerGrid] = [
    document.getElementById('socialLinks'),
    document.getElementById('footerSocial'),
  ];

  try {
    const response = await publicApi.settings();
    const settings = response?.data || {};

    const links = [
      { key: 'whatsapp', icon: 'fa-brands fa-whatsapp', color: 'var(--color-success)', label: 'WhatsApp' },
      { key: 'instagram', icon: 'fa-brands fa-instagram', color: 'var(--color-primary)', label: 'Instagram' },
      { key: 'facebook', icon: 'fa-brands fa-facebook', color: '#1877f2', label: 'Facebook' },
      { key: 'tiktok', icon: 'fa-brands fa-tiktok', color: '#111827', label: 'TikTok' },
    ];

    const html = links
      .filter(l => settings[l.key] && (l.key !== 'whatsapp' || getWhatsAppUrl(settings[l.key])))
      .map(l => `
        <a href="${l.key === 'whatsapp' ? getWhatsAppUrl(settings[l.key]) : sanitizeUrl(settings[l.key])}" target="_blank" rel="noopener noreferrer" class="card flex-center" style="min-height:100px;text-decoration:none;color:white;background:${l.color};" aria-label="${l.label}">
          <i class="${l.icon}" style="font-size:2.5rem;" aria-hidden="true"></i>
        </a>
      `).join('');

    if (grid) {
      grid.innerHTML = html + (settings.instapayLink ? `
        <a href="${sanitizeUrl(settings.instapayLink)}" target="_blank" rel="noopener noreferrer" class="card flex-center" style="min-height:100px;text-decoration:none;color:var(--color-text);background:var(--color-surface);">
          <i class="fa-solid fa-credit-card" style="font-size:2.5rem;color:var(--color-primary);" aria-hidden="true"></i>
        </a>` : '');
    }

    if (footerGrid) {
      footerGrid.innerHTML = links
        .filter(l => settings[l.key] && (l.key !== 'whatsapp' || getWhatsAppUrl(settings[l.key])))
        .map(l => `
          <li><a href="${l.key === 'whatsapp' ? getWhatsAppUrl(settings[l.key]) : sanitizeUrl(settings[l.key])}" target="_blank" rel="noopener noreferrer"><i class="${l.icon}" aria-hidden="true"></i> ${l.label}</a></li>
        `).join('');
    }
  } catch (error) {
    console.error('Failed to load social links:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
