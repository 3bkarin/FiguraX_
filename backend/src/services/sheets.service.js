import { getSheetsClient } from '../config/google.js';
import { env } from '../config/env.js';
import { SHEET_NAMES, SHEET_HEADERS, ID_PREFIXES } from '../config/constants.js';
import { generateId } from '../utils/ids.js';
import { sanitizeForSheets } from '../utils/sanitize.js';

// Re-export SHEET_NAMES for test compatibility
export { SHEET_NAMES } from '../config/constants.js';

const SPREADSHEET_ID = env.google.sheetId;
const sheets = getSheetsClient();

const headerCache = new Map();
const rowCache = new Map();
const CACHE_TTL = 30000;

async function ensureSheetExists(sheetName, headers) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetExists = spreadsheet.data.sheets?.some(s => s.properties.title === sheetName);

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: sheetName },
            },
          }],
        },
      });
      await appendRow(sheetName, headers);
      console.log(`✅ Created sheet: ${sheetName}`);
      return;
    }

    const existing = await getSheetData(sheetName, true);
    const currentHeaders = existing.headers || [];

    // These sheets have positional row writers, so their header order must
    // exactly match the service schema. Reordering the header row is safe for
    // existing records because existing records are already stored in the
    // same positional order as the current writers.
    const positionalSheets = new Set([
      SHEET_NAMES.PENDING_ORDERS,
      SHEET_NAMES.ACCEPTED_ORDERS,
      SHEET_NAMES.REVIEWS,
    ]);

    const targetHeaders = positionalSheets.has(sheetName)
      ? headers
      : [...currentHeaders, ...headers.filter(h => !currentHeaders.includes(h))];

    const changed = targetHeaders.length !== currentHeaders.length ||
      targetHeaders.some((header, index) => header !== currentHeaders[index]);

    if (changed) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!1:1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [targetHeaders] },
      });
      clearCache(sheetName);
      console.log(`✅ Updated headers for sheet: ${sheetName}`);
    }
  } catch (error) {
    console.error(`Error ensuring sheet ${sheetName}:`, error.message);
    throw error;
  }
}

export async function initializeSheets() {
  for (const [sheetName, headers] of Object.entries(SHEET_HEADERS)) {
    await ensureSheetExists(sheetName, headers);
  }
  console.log('✅ All sheets initialized');
}

async function getSheetData(sheetName, forceRefresh = false) {
  const cacheKey = sheetName;
  const now = Date.now();

  if (!forceRefresh && headerCache.has(cacheKey)) {
    const cached = headerCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const range = `${sheetName}!A:Z`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    headerCache.set(cacheKey, { data: { headers, rows: data }, timestamp: now });
    return { headers, rows: data };
  } catch (error) {
    console.error(`Error reading sheet ${sheetName}:`, error.message);
    throw error;
  }
}

function clearCache(sheetName) {
  headerCache.delete(sheetName);
  rowCache.delete(sheetName);
}

export async function appendRow(sheetName, values) {
  const sanitized = sanitizeForSheets(values);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [sanitized] },
  });
  clearCache(sheetName);
}

export async function updateRow(sheetName, rowIndex, values) {
  const sanitized = sanitizeForSheets(values);
  const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [sanitized] },
  });
  clearCache(sheetName);
}

export async function findRowById(sheetName, idColumn, idValue) {
  const { headers, rows } = await getSheetData(sheetName);
  const idColIndex = headers.indexOf(idColumn);
  if (idColIndex === -1) return null;

  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][idColumn] || '').trim() === String(idValue).trim()) {
      return { rowIndex: i + 2, row: rows[i], headers };
    }
  }
  return null;
}

export async function findRows(sheetName, filters) {
  const { headers, rows } = await getSheetData(sheetName);
  return rows.filter(row => {
    return Object.entries(filters).every(([key, value]) => {
      const rowValue = String(row[key] || '').trim().toLowerCase();
      const filterValue = String(value).trim().toLowerCase();
      return rowValue === filterValue;
    });
  }).map((row, index) => {
    const originalIndex = rows.findIndex(r => r === row);
    return { rowIndex: originalIndex + 2, row, headers };
  });
}

export async function getAllRows(sheetName, forceRefresh = false) {
  const { headers, rows } = await getSheetData(sheetName, forceRefresh);
  return rows.map((row, index) => ({ rowIndex: index + 2, row, headers }));
}

export async function deleteRow(sheetName, rowIndex) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = spreadsheet.data.sheets?.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    },
  });
  clearCache(sheetName);
}

export async function getNextId(prefix) {
  return generateId(prefix);
}

export async function calculateProductCount(categoryName) {
  const { rows } = await getSheetData(SHEET_NAMES.PRODUCTS);
  return rows.filter(r => r['CategoryName'] === categoryName && r['Active'] !== 'false').length;
}

export async function updateProductCount(categoryName) {
  const count = await calculateProductCount(categoryName);
  const result = await findRowById(SHEET_NAMES.CATEGORIES, 'Name', categoryName);
  if (result) {
    const headers = result.headers;
    const countIndex = headers.indexOf('ProductCount');
    if (countIndex !== -1) {
      const newRow = [...Object.values(result.row)];
      newRow[countIndex] = count;
      await updateRow(SHEET_NAMES.CATEGORIES, result.rowIndex, newRow);
    }
  }
}

export function invalidateCache(sheetName) {
  clearCache(sheetName);
}