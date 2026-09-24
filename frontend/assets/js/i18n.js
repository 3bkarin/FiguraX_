const translations = {
  ar: {},
  en: {},
};

let currentLanguage = 'ar';
let listeners = [];

function prettifyKey(key) {
  const last = String(key || '')
    .split('.')
    .pop()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();

  const dictionary = {
    ar: {
      home: 'الرئيسية',
      products: 'المنتجات',
      product: 'المنتج',
      cart: 'العربة',
      checkout: 'إتمام الطلب',
      admin: 'لوحة التحكم',
      viewAll: 'عرض الكل',
      featured: 'الأكثر مبيعاً',
      sale: 'خصم',
      originalPrice: 'السعر قبل الخصم',
      price: 'السعر',
      color: 'اللون',
      material: 'الخامة',
      quantity: 'الكمية',
      options: 'الخيارات',
      customize: 'تخصيص',
      notes: 'ملاحظات',
      title: 'العنوان',
      description: 'الوصف',
      addToCart: 'أضف إلى العربة',
      orderSuccess: 'تم تسجيل الطلب بنجاح',
      confirmOrder: 'تأكيد الطلب',
      processing: 'جاري المعالجة...',
      loading: 'جاري التحميل...',
    },
    en: {
      home: 'Home',
      products: 'Products',
      product: 'Product',
      cart: 'Cart',
      checkout: 'Checkout',
      admin: 'Admin',
      viewAll: 'View all',
      featured: 'Featured',
      sale: 'Sale',
      originalPrice: 'Original price',
      price: 'Price',
      color: 'Color',
      material: 'Material',
      quantity: 'Quantity',
      options: 'Options',
      customize: 'Customize',
      notes: 'Notes',
      title: 'Title',
      description: 'Description',
      addToCart: 'Add to cart',
      orderSuccess: 'Order placed successfully',
      confirmOrder: 'Confirm order',
      processing: 'Processing...',
      loading: 'Loading...',
    },
  };

  if (dictionary[currentLanguage] && dictionary[currentLanguage][last]) {
    return dictionary[currentLanguage][last];
  }

  return last || key;
}

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem('figurax_language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    notifyListeners();
  }
}

export function getLanguage() {
  return currentLanguage;
}

export function initLanguage() {
  const saved = localStorage.getItem('figurax_language');
  if (saved && translations[saved]) {
    currentLanguage = saved;
  } else {
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) {
      currentLanguage = browserLang;
    }
  }
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
}

export function t(key, params = {}) {
  const keys = String(key || '').split('.');
  let value = translations[currentLanguage];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      value = translations.ar;
      for (const k2 of keys) {
        if (value && typeof value === 'object' && k2 in value) {
          value = value[k2];
        } else {
          const fallback = prettifyKey(key);
          return typeof fallback === 'string'
            ? fallback.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] || match)
            : key;
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') {
    return prettifyKey(key);
  }

  return value.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] || match);
}

export function loadTranslations(lang, data) {
  translations[lang] = data;
  if (lang === currentLanguage) {
    notifyListeners();
  }
}

export function onLanguageChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

function notifyListeners() {
  listeners.forEach(cb => cb(currentLanguage));
}

export function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      if (el.type === 'placeholder') {
        el.placeholder = translation;
      } else {
        el.value = translation;
      }
    } else {
      el.textContent = translation;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
}
