export function sanitizeForSheets(values) {
  return values.map(v => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v).replace(/[\r\n]+/g, ' ').trim();
  });
}

export function sanitizeHtml(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeText(input, maxLength = 1000) {
  if (!input) return '';
  return String(input).trim().slice(0, maxLength);
}

export function sanitizeEmail(email) {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

export function sanitizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/[^\d+]/g, '').trim();
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone) {
  const cleaned = sanitizePhone(phone);
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function sanitizeFileName(fileName) {
  if (!fileName) return 'file';
  return String(fileName)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100);
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

export function validateRequiredFields(obj, fields) {
  const missing = [];
  for (const field of fields) {
    if (!obj[field] || String(obj[field]).trim() === '') {
      missing.push(field);
    }
  }
  return missing;
}