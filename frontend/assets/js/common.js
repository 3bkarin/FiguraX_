import { t } from './i18n.js';
import { config } from './config.js';

export function formatCurrency(amount, currency = 'EGP', language = 'ar') {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

export function formatDate(date, language = 'ar') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date, language = 'ar') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function showToast(message, type = 'info', duration = 3000) {
  const container = getOrCreateToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const content = document.createElement('div');
  content.className = 'toast-content';
  
  const messageEl = document.createElement('span');
  messageEl.className = 'toast-message';
  messageEl.textContent = message;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';
  
  content.appendChild(messageEl);
  content.appendChild(closeBtn);
  toast.appendChild(content);

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  closeBtn.addEventListener('click', () => hideToast(toast));

  setTimeout(() => hideToast(toast), duration);
}

function getOrCreateToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function hideToast(toast) {
  toast.classList.remove('show');
  setTimeout(() => toast.remove(), 300);
}

export function showModal(content, options = {}) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  const modalEl = document.createElement('div');
  modalEl.className = 'modal';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-labelledby', 'modal-title');
  
  const header = document.createElement('div');
  header.className = 'modal-header';
  
  const title = document.createElement('h3');
  title.id = 'modal-title';
  title.textContent = options.title || '';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  const body = document.createElement('div');
  body.className = 'modal-body';
  if (typeof content === 'string') {
    body.textContent = content;
  } else if (content instanceof Node) {
    body.appendChild(content);
  }
  
  let footer = null;
  if (options.footer) {
    footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.innerHTML = options.footer;
  }
  
  modalEl.appendChild(header);
  modalEl.appendChild(body);
  if (footer) modalEl.appendChild(footer);
  modal.appendChild(modalEl);

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.classList.add('show'));

  const closeModal = () => {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = '';
      if (options.onClose) options.onClose();
    }, 300);
  };

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  return { close: closeModal, element: modal };
}

export function showConfirm(message, onConfirm, onCancel) {
  const content = document.createElement('div');
  const paragraph = document.createElement('p');
  paragraph.textContent = message;
  content.appendChild(paragraph);

  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  const cancel = document.createElement('button');
  cancel.className = 'btn btn-secondary';
  cancel.dataset.action = 'cancel';
  cancel.textContent = t('common.cancel');
  const confirm = document.createElement('button');
  confirm.className = 'btn btn-primary';
  confirm.dataset.action = 'confirm';
  confirm.textContent = t('common.confirm');
  footer.append(cancel, confirm);

  const modal = showModal(content, { title: 'تأكيد' });
  modal.element.querySelector('.modal')?.appendChild(footer);
  modal.element.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'confirm') onConfirm?.();
    if (e.target.dataset.action === 'cancel') onCancel?.();
  });
  return modal.element;
}

export function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${Date.now()}-${crypto.randomUUID()}`;
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}


export function getPublicImageUrl(url) {
  if (!url) return '';

  const value = String(url).trim();
  if (!value) return '';

  // Already a backend proxy URL.
  if (value.includes('/api/products/image/')) {
    if (/^https?:\/\//i.test(value)) return value;
    return `${config.apiBase.replace(/\/api\/?$/, '')}${value.startsWith('/') ? '' : '/'}${value}`;
  }

  // Google Drive URL formats.
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /[?&](?:id|fileId)=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return `${config.apiBase.replace(/\/$/, '')}/products/image/${encodeURIComponent(match[1])}`;
    }
  }

  // Raw Drive file IDs are also accepted, but only when they look like an ID.
  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) {
    return `${config.apiBase.replace(/\/$/, '')}/products/image/${encodeURIComponent(value)}`;
  }

  return sanitizeUrl(value);
}

export function getPrivateFileUrl(url) {
  if (!url) return '';

  const value = String(url).trim();
  if (!value) return '';

  if (value.startsWith('drive://')) {
    const fileId = value.slice('drive://'.length).trim();
    if (!fileId) return '';
    return `${config.apiBase.replace(/\/$/, '')}/admin/drive/private/${encodeURIComponent(fileId)}`;
  }

  const match = value.match(/\/d\/([a-zA-Z0-9_-]+)/) || value.match(/[?&](?:id|fileId)=([a-zA-Z0-9_-]+)/);
  if (match?.[1]) {
    return `${config.apiBase.replace(/\/$/, '')}/admin/drive/private/${encodeURIComponent(match[1])}`;
  }

  return sanitizeUrl(value);
}

export function getWhatsAppUrl(value, message = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^https?:\/\/(?:www\.)?wa\.me\//i.test(raw) || /^https?:\/\/(?:api\.)?whatsapp\.com\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (message) url.searchParams.set('text', message);
      return url.toString();
    } catch {
      return '';
    }
  }

  let phone = raw.replace(/[^0-9+]/g, '');
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0')) phone = `20${phone.slice(1)}`;
  if (!phone.startsWith('20') && /^1[0-2]\d{8}$/.test(phone)) phone = `20${phone}`;
  if (!/^20\d{10}$/.test(phone)) return '';

  const url = new URL(`https://wa.me/${phone}`);
  if (message) url.searchParams.set('text', message);
  return url.toString();
}

export function setupLanguageSwitcher() {
  const toggle = document.getElementById('languageToggle');
  const label = document.getElementById('languageLabel');

  if (toggle) {
    const currentLanguage = document.documentElement.lang === 'en' ? 'en' : 'ar';
    toggle.checked = currentLanguage === 'en';

    const updateLabel = () => {
      const targetLanguage = toggle.checked ? 'ar' : 'en';
      if (label) label.textContent = targetLanguage === 'en' ? 'English' : 'العربية';
      toggle.setAttribute('aria-label', targetLanguage === 'en' ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic');
    };

    updateLabel();
    toggle.addEventListener('change', () => {
      const lang = toggle.checked ? 'en' : 'ar';
      localStorage.setItem('figurax_language', lang);
      updateLabel();
      window.location.reload();
    });
    return;
  }

  // Backward-compatible fallback for any page that still uses the old buttons.
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      document.querySelectorAll('.lang-btn').forEach(b => {
        const active = b.dataset.lang === lang;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      localStorage.setItem('figurax_language', lang);
      window.location.reload();
    });
  });
}

export function setupMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('sideMenuOverlay');
  const closeBtn = document.getElementById('sideMenuClose');
  if (!btn || !menu || !overlay) return;

  const closeMenu = () => {
    menu.classList.remove('open');
    overlay.hidden = true;
    document.body.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    btn.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  };

  const openMenu = () => {
    menu.classList.add('open');
    overlay.hidden = false;
    document.body.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    btn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
  };

  btn.addEventListener('click', () => {
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });
  closeBtn?.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('open')) closeMenu();
  });
}

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function setQueryParam(name, value) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  window.history.replaceState({}, '', url);
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

export function downloadFile(url, filename) {
  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) return;
  const a = document.createElement('a');
  a.href = safeUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}