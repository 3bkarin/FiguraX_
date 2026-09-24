export function formatDate(date, language = 'ar', options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', defaultOptions);
}

export function formatDateTime(date, language = 'ar') {
  return formatDate(date, language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date, language = 'ar') {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const strings = {
    ar: {
      now: 'الآن',
      seconds: 'ثانية',
      minutes: 'دقيقة',
      hours: 'ساعة',
      days: 'يوم',
      ago: 'مضت',
    },
    en: {
      now: 'Just now',
      seconds: 'second',
      minutes: 'minute',
      hours: 'hour',
      days: 'day',
      ago: 'ago',
    },
  };

  const t = strings[language] || strings.ar;

  if (diffSecs < 60) return `${diffSecs} ${t.seconds} ${t.ago}`;
  if (diffMins < 60) return `${diffMins} ${t.minutes} ${t.ago}`;
  if (diffHours < 24) return `${diffHours} ${t.hours} ${t.ago}`;
  if (diffDays < 30) return `${diffDays} ${t.days} ${t.ago}`;

  return formatDate(d, language);
}

export function getStartOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}