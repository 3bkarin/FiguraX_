const host = window.location.hostname;

const isLocalDevelopment =
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host === '192.168.1.3';

const DEVELOPMENT_API_BASE = `http://${host}:3000/api`;

const PRODUCTION_API_BASE =
  'https://figurax-production.up.railway.app/api';
const API_BASE_URL = isLocalDevelopment
  ? DEVELOPMENT_API_BASE
  : PRODUCTION_API_BASE;

const ASSETS_BASE = './assets';

export const config = {
  apiBase: API_BASE_URL,
  assetsBase: ASSETS_BASE,
  defaultLanguage: 'ar',
  supportedLanguages: ['ar', 'en'],
  currency: 'EGP',
};
