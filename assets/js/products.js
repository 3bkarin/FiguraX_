import { publicApi } from './api.js';
import { t, initLanguage, loadTranslations, translatePage, onLanguageChange, getLanguage, setLanguage } from './i18n.js';
import { getCartCount, onCartUpdate, addToCart } from './cart.js';
import { showToast, escapeHtml, formatCurrency, debounce, sanitizeUrl, setupLanguageSwitcher, setupMobileMenu, getQueryParam, getPublicImageUrl } from './common.js';

let allProducts = [];
let allCategories = [];

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
    renderCategories();
    renderProducts();
  });

  setupLanguageSwitcher();
  setupMobileMenu();
  updateCartCount();
  onCartUpdate(updateCartCount);

  await Promise.all([
    loadCategories(),
    loadProducts(),
  ]);

  setupFilters();
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
  try {
    const response = await publicApi.categories();
    allCategories = response?.data || [];
    renderCategories();
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = `<div class="flex-center" style="grid-column:1/-1;padding:var(--spacing-xl)"><div class="spinner"></div><p>${t('common.loading')}</p></div>`;

  try {
    const response = await publicApi.products({ active: 'true' });
    allProducts = (response?.data || []).filter(p => p.active !== false);

    const category = getQueryParam('category');
    const search = getQueryParam('search');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchInput');

    if (categoryFilter && category) {
      categoryFilter.value = category;
    }
    if (searchInput && search) {
      searchInput.value = search;
    }

    renderProducts();
  } catch (error) {
    console.error('Failed to load products:', error);
    grid.innerHTML = `<p class="text-center" style="grid-column:1/-1;color:var(--color-error)">${t('common.error')}</p>`;
  }
}

function renderCategories() {
  const select = document.getElementById('categoryFilter');
  if (!select) return;

  const current = select.value;
  const options = ['<option value="">' + (t('product.allCategories') || 'جميع التصنيفات') + '</option>'];

  const names = [...new Set(allCategories.map(c => c.name).filter(Boolean))];
  names.forEach(name => {
    options.push(`<option value="${escapeHtml(name)}" ${current === name ? 'selected' : ''}>${escapeHtml(name)}</option>`);
  });

  select.innerHTML = options.join('');
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

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;

  const categoryFilter = document.getElementById('categoryFilter')?.value || '';
  const searchText = document.getElementById('searchInput')?.value?.trim().toLowerCase() || '';

  let products = [...allProducts];

  if (categoryFilter) {
    products = products.filter(p => (p.categoryName || '').toLowerCase() === categoryFilter.toLowerCase());
  }

  if (searchText) {
    products = products.filter(p =>
      (p.name || '').toLowerCase().includes(searchText) ||
      (p.categoryName || '').toLowerCase().includes(searchText) ||
      (p.description || '').toLowerCase().includes(searchText)
    );
  }

  if (!products.length) {
    grid.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;

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

          ${
            product.description
              ? `<p class="card-text">${escapeHtml(product.description)}</p>`
              : ''
          }

          <div class="product-card-actions">
            <a href="${href}" class="btn btn-secondary btn-sm flex-1">${t('product.viewDetails') || 'عرض التفاصيل'}</a>
            <button class="btn btn-primary btn-sm flex-1 add-to-cart" data-product-id="${escapeHtml(product.id)}">
              <i class="fa-solid fa-cart-plus" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const productId = btn.dataset.productId;
      const product = products.find(p => p.id === productId);
      if (product) {
        addToCart(product, 1);
        showToast(t('product.addedToCart') || 'تم إضافة المنتج إلى العربة', 'success');
      }
    });
  });
}

function setupFilters() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');

  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      setQuery('search', searchInput.value.trim() || null);
      renderProducts();
    }, 180));
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      setQuery('category', categoryFilter.value || null);
      renderProducts();
    });
  }
}

function setQuery(name, value) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  window.history.replaceState({}, '', url);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
