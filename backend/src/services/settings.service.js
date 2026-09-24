import { getAllRows, findRowById, appendRow, updateRow, invalidateCache, SHEET_NAMES } from './sheets.service.js';
import { SETTINGS_KEYS, DEFAULT_SETTINGS } from '../config/constants.js';

const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export async function initializeSettings() {
  const rows = await getAllRows(SHEET_NAMES.SETTINGS);
  const existingKeys = new Set(rows.map(r => r.row.Key));

  for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
    if (!existingKeys.has(key)) {
      await appendRow(SHEET_NAMES.SETTINGS, [
        key,
        config.value,
        config.description,
        new Date().toISOString()
      ]);
    }
  }
}

export async function getSetting(key) {
  const cached = settingsCache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  const rows = await getAllRows(SHEET_NAMES.SETTINGS);
  const setting = rows.find(r => r.row.Key === key);
  const value = setting?.row.Value || DEFAULT_SETTINGS[key]?.value || '';

  settingsCache.set(key, { value, timestamp: now });
  return value;
}

export async function getAllSettings() {
  const rows = await getAllRows(SHEET_NAMES.SETTINGS);
  const settings = {};

  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const setting = rows.find(r => r.row.Key === key);
    settings[key] = setting?.row.Value || DEFAULT_SETTINGS[key]?.value || '';
  }

  return settings;
}

export async function getPublicSettings() {
  const settings = await getAllSettings();

  return {
    brandName: settings[SETTINGS_KEYS.BRAND_NAME],
    whatsapp: settings[SETTINGS_KEYS.WHATSAPP],
    instagram: settings[SETTINGS_KEYS.INSTAGRAM],
    facebook: settings[SETTINGS_KEYS.FACEBOOK],
    tiktok: settings[SETTINGS_KEYS.TIKTOK],
    instapayUsername: settings[SETTINGS_KEYS.INSTAPAY_USERNAME],
    instapayLink: settings[SETTINGS_KEYS.INSTAPAY_LINK],
    companyEmail: settings[SETTINGS_KEYS.COMPANY_EMAIL],
    currency: settings[SETTINGS_KEYS.CURRENCY],
    teamSize: parseInt(settings[SETTINGS_KEYS.TEAM_SIZE]) || 5,
  };
}

export async function updateSetting(key, value, description = '') {
  const existing = await findRowById(SHEET_NAMES.SETTINGS, 'Key', key);
  const now = new Date().toISOString();

  if (existing) {
    const headers = existing.headers;
    const newRow = [...Object.values(existing.row)];

    newRow[headers.indexOf('Value')] = value;
    newRow[headers.indexOf('Description')] =
      description || existing.row.Description;
    newRow[headers.indexOf('UpdatedAt')] = now;

    await updateRow(SHEET_NAMES.SETTINGS, existing.rowIndex, newRow);
  } else {
    await appendRow(SHEET_NAMES.SETTINGS, [
      key,
      value,
      description,
      now
    ]);
  }

  settingsCache.delete(key);
  invalidateCache(SHEET_NAMES.SETTINGS);
}

export async function updateSettings(settingsObj) {
  for (const [key, value] of Object.entries(settingsObj)) {
    await updateSetting(key, value);
  }
}

export function invalidateSettingsCache() {
  settingsCache.clear();
}