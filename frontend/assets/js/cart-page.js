import { getCart, getCartCount, getCartTotal, onCartUpdate, removeFromCart, updateQuantity, clearCart } from './cart.js';
import { t, initLanguage, loadTranslations, translatePage, onLanguageChange, getLanguage, setLanguage } from './i18n.js';
import { showToast, escapeHtml, formatCurrency, setupLanguageSwitcher, setupMobileMenu, sanitizeUrl } from './common.js';

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
    renderCart();
  });

  setupLanguageSwitcher();
  setupMobileMenu();
  updateCartCount();
  onCartUpdate(() => {
    updateCartCount();
    renderCart();
  });

  renderCart();
}

function updateCartCount() {
  const count = getCartCount();
  const el = document.getElementById('cartCount');
  if (el) {
    el.textContent = String(count);
    el.style.display = count > 0 ? 'flex' : 'none';
  }
}

function renderCart() {
  const container = document.getElementById('cartContent');
  const cart = getCart();

  if (!container) return;

  if (!cart.length) {
    container.innerHTML = `
      <div class="text-center" style="padding:var(--spacing-2xl);">
        <i class="fa-solid fa-cart-shopping" style="font-size:4rem;color:var(--color-text-muted);margin-bottom:var(--spacing-md);" aria-hidden="true"></i>
        <h3>${t('cart.empty')}</h3>
        <p>${t('cart.subtitle')}</p>
        <a href="products.html" class="btn btn-primary mt-lg">${t('cart.continueShopping')}</a>
      </div>
    `;
    return;
  }

  const subtotal = getCartTotal();

  container.innerHTML = `
    <div class="grid cart-layout" style="grid-template-columns:minmax(0,1fr) 360px;gap:var(--spacing-xl);align-items:start;">
      <div>
        <div class="cart-table-header flex" style="font-weight:700;padding:var(--spacing-md);background:var(--color-surface);border-radius:var(--border-radius-md) var(--border-radius-md) 0 0;border:1px solid var(--color-border);border-bottom:none;">
          <div style="flex:2;">${t('product.product') || 'المنتج'}</div>
          <div style="width:120px;text-align:center;">${t('product.price')}</div>
          <div style="width:160px;text-align:center;">${t('product.quantity')}</div>
          <div style="width:120px;text-align:center;">${t('cart.total')}</div>
          <div style="width:60px;"></div>
        </div>

        <div id="cartItems">
          ${cart.map(item => {
            const options = item.options ? Object.entries(item.options).filter(([, v]) => v !== '' && v !== false && v !== null && v !== undefined).map(([k, v]) => `<div>${escapeHtml(k)}: ${escapeHtml(String(v))}</div>`).join('') : '';
            return `
              <article class="cart-item flex" data-product-id="${escapeHtml(item.productId)}" data-variant-key="${escapeHtml(item.variantKey || '')}" style="padding:var(--spacing-md);border:1px solid var(--color-border);border-top:none;background:var(--color-surface);gap:var(--spacing-md);align-items:center;">
                <div class="cart-item-image" style="width:84px;height:84px;flex-shrink:0;border-radius:var(--border-radius-md);overflow:hidden;background:var(--color-border);">
                  ${
                    item.imageUrl
                      ? `<img src="${sanitizeUrl(item.imageUrl)}" alt="${escapeHtml(item.name)}" style="width:100%;height:100%;object-fit:cover;">`
                      : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-cube" style="font-size:2rem;color:var(--color-text-muted);" aria-hidden="true"></i></div>'
                  }
                </div>

                <div class="cart-item-details" style="flex:2;min-width:0;">
                  <h4 style="font-weight:700;margin-bottom:var(--spacing-xs);">${escapeHtml(item.name)}</h4>
                  ${options ? `<div style="font-size:var(--font-size-sm);color:var(--color-text-muted);line-height:1.5;">${options}</div>` : ''}
                </div>

                <div style="width:120px;text-align:center;">${formatCurrency(item.price)}</div>

                <div class="quantity-selector" style="justify-content:center;min-width:160px;">
                  <button type="button" class="quantity-btn decrease-qty" data-product-id="${escapeHtml(item.productId)}" data-variant-key="${escapeHtml(item.variantKey || '')}" aria-label="${t('common.decrease') || 'إنقاص'}"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>
                  <input type="number" class="quantity-input qty-input" value="${item.quantity}" min="1" max="99" data-product-id="${escapeHtml(item.productId)}" data-variant-key="${escapeHtml(item.variantKey || '')}" aria-label="${t('product.quantity')}" style="width:60px;">
                  <button type="button" class="quantity-btn increase-qty" data-product-id="${escapeHtml(item.productId)}" data-variant-key="${escapeHtml(item.variantKey || '')}" aria-label="${t('common.increase') || 'زيادة'}"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
                </div>

                <div style="width:120px;text-align:center;font-weight:700;color:var(--color-primary);">${formatCurrency(item.price * item.quantity)}</div>

                <button type="button" class="btn btn-danger btn-sm remove-item" data-product-id="${escapeHtml(item.productId)}" data-variant-key="${escapeHtml(item.variantKey || '')}" aria-label="${t('cart.remove')} ${escapeHtml(item.name)}" style="width:44px;height:44px;">
                  <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
              </article>
            `;
          }).join('')}
        </div>
      </div>

      <aside class="checkout-summary" aria-labelledby="summary-title">
        <h2 id="summary-title" class="checkout-summary-title">${t('cart.orderSummary') || t('cart.title')}</h2>
        <div class="checkout-summary-row"><span>${t('cart.subtotal')}</span><span>${formatCurrency(subtotal)}</span></div>
        <div class="checkout-summary-row"><span>${t('cart.shipping')}</span><span>${t('cart.calculatedLater') || 'يحسب لاحقاً'}</span></div>
        <div class="checkout-summary-row total"><span>${t('cart.total')}</span><span id="cartTotal">${formatCurrency(subtotal)}</span></div>
        <a href="checkout.html" class="btn btn-primary btn-block btn-lg mt-lg" id="checkoutBtn">${t('cart.checkout')}</a>
        <p class="text-center mt-md" style="font-size:var(--font-size-sm);color:var(--color-text-muted);">${t('cart.shippingNote') || 'سيتم حساب الشحن في صفحة الدفع حسب المحافظة'}</p>
      </aside>
    </div>
  `;

  setupCartActions();
}

function setupCartActions() {
  document.querySelectorAll('.decrease-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.productId;
      const variantKey = btn.dataset.variantKey || null;
      const input = document.querySelector(`.qty-input[data-product-id="${CSS.escape(productId)}"]${variantKey ? `[data-variant-key="${CSS.escape(variantKey)}"]` : ''}`);
      const val = parseInt(input?.value, 10) || 1;
      if (val > 1) {
        input.value = val - 1;
        updateQuantity(productId, val - 1, variantKey);
      }
    });
  });

  document.querySelectorAll('.increase-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.productId;
      const variantKey = btn.dataset.variantKey || null;
      const input = document.querySelector(`.qty-input[data-product-id="${CSS.escape(productId)}"]${variantKey ? `[data-variant-key="${CSS.escape(variantKey)}"]` : ''}`);
      const val = parseInt(input?.value, 10) || 1;
      if (val < 99) {
        input.value = val + 1;
        updateQuantity(productId, val + 1, variantKey);
      }
    });
  });

  document.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', () => {
      const productId = input.dataset.productId;
      const variantKey = input.dataset.variantKey || null;
      let val = parseInt(input.value, 10) || 1;
      val = Math.max(1, Math.min(99, val));
      input.value = val;
      updateQuantity(productId, val, variantKey);
    });
  });

  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.productId;
      const variantKey = btn.dataset.variantKey || null;
      removeFromCart(productId, variantKey);
      showToast(t('cart.removed') || 'تم حذف المنتج من العربة', 'success');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
