import {
  getAllRows,
  findRowById,
  appendRow,
  updateRow,
  invalidateCache,
  SHEET_NAMES,
} from './sheets.service.js';


const DEFAULT_SHIPPING_RATES = {
  'القاهرة': 50,
  'الجيزة': 50,
  'الإسكندرية': 60,
  'القليوبية': 55,
  'المنوفية': 60,
  'البحيرة': 65,
  'كفر الشيخ': 65,
  'الغربية': 60,
  'الدقهلية': 65,
  'الشرقية': 65,
  'دمياط': 70,
  'بورسعيد': 70,
  'الإسماعيلية': 70,
  'السويس': 70,
  'شمال سيناء': 80,
  'جنوب سيناء': 80,
  'البحر الأحمر': 80,
  'الفيوم': 65,
  'بني سويف': 70,
  'المنيا': 75,
  'أسيوط': 80,
  'سوهاج': 85,
  'قنا': 90,
  'الأقصر': 90,
  'أسوان': 95,
  'الوادي الجديد': 100,
  'مطروح': 90,
};


function repairMojibake(value) {
  const text = String(value ?? '').trim();

  if (!text) {
    return '';
  }

  /*
   * Detect common UTF-8 -> Latin-1/Windows-1252 corruption.
   * Examples:
   * القاهرة -> Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©
   */
  if (!/[ÃÂØÙÐ]/.test(text)) {
    return text;
  }

  try {
    const bytes = Uint8Array.from(
      [...text].map((char) => char.charCodeAt(0))
    );

    const repaired = new TextDecoder('utf-8', {
      fatal: true,
    }).decode(bytes);

    return repaired.trim();
  } catch {
    return text;
  }
}


function normalizeGovernorate(value) {
  return repairMojibake(value)
    .replace(/\s+/g, ' ')
    .trim();
}


export function getDefaultShippingRates() {
  return {
    ...DEFAULT_SHIPPING_RATES,
  };
}


export async function getShippingRates() {
  const rows = await getAllRows(
    SHEET_NAMES.SHIPPING_RATES
  );

  return rows
    .map((item) => item.row)
    .filter(
      (row) =>
        row.Governorate &&
        row.Active !== 'false'
    )
    .map((row) => ({
      governorate: normalizeGovernorate(
        row.Governorate
      ),
      fee:
        parseFloat(row.ShippingFee) || 0,
      active:
        row.Active !== 'false',
      updatedAt:
        row.UpdatedAt,
    }))
    .sort((a, b) =>
      a.governorate.localeCompare(
        b.governorate,
        'ar'
      )
    );
}


export async function getShippingRate(
  governorate
) {
  const requested =
    normalizeGovernorate(
      governorate
    );

  if (!requested) {
    return 0;
  }

  const rates =
    await getShippingRates();

  const rate =
    rates.find(
      (item) =>
        normalizeGovernorate(
          item.governorate
        ) === requested
    );

  return rate?.fee || 0;
}


export async function setShippingRate(
  governorate,
  fee
) {
  const normalizedGovernorate =
    normalizeGovernorate(
      governorate
    );

  if (!normalizedGovernorate) {
    throw new Error(
      'Governorate is required'
    );
  }

  const numericFee =
    parseFloat(fee);

  if (
    !Number.isFinite(
      numericFee
    ) ||
    numericFee < 0
  ) {
    throw new Error(
      'Invalid shipping fee'
    );
  }

  /*
   * First try exact/correct governorate.
   */
  let existing =
    await findRowById(
      SHEET_NAMES.SHIPPING_RATES,
      'Governorate',
      normalizedGovernorate
    );

  /*
   * If the Sheet contains mojibake,
   * find the row manually after repairing it.
   */
  if (!existing) {
    const rows =
      await getAllRows(
        SHEET_NAMES.SHIPPING_RATES
      );

    const match =
      rows.find(
        (item) =>
          normalizeGovernorate(
            item.row?.Governorate
          ) === normalizedGovernorate
      );

    if (match) {
      existing = match;
    }
  }

  const now =
    new Date().toISOString();

  if (existing) {
    const headers =
      existing.headers;

    const newRow = [
      ...Object.values(
        existing.row
      ),
    ];

    const governorateIndex =
      headers.indexOf(
        'Governorate'
      );

    const shippingFeeIndex =
      headers.indexOf(
        'ShippingFee'
      );

    const activeIndex =
      headers.indexOf(
        'Active'
      );

    const updatedAtIndex =
      headers.indexOf(
        'UpdatedAt'
      );

    if (
      governorateIndex >= 0
    ) {
      newRow[
        governorateIndex
      ] =
        normalizedGovernorate;
    }

    if (
      shippingFeeIndex >= 0
    ) {
      newRow[
        shippingFeeIndex
      ] =
        numericFee;
    }

    if (
      activeIndex >= 0
    ) {
      newRow[
        activeIndex
      ] =
        'true';
    }

    if (
      updatedAtIndex >= 0
    ) {
      newRow[
        updatedAtIndex
      ] =
        now;
    }

    await updateRow(
      SHEET_NAMES.SHIPPING_RATES,
      existing.rowIndex,
      newRow
    );
  } else {
    await appendRow(
      SHEET_NAMES.SHIPPING_RATES,
      [
        normalizedGovernorate,
        numericFee,
        'true',
        now,
      ]
    );
  }

  invalidateCache(
    SHEET_NAMES.SHIPPING_RATES
  );

  return {
    success: true,
    governorate:
      normalizedGovernorate,
    fee: numericFee,
  };
}


export async function deleteShippingRate(
  governorate
) {
  const normalizedGovernorate =
    normalizeGovernorate(
      governorate
    );

  let existing =
    await findRowById(
      SHEET_NAMES.SHIPPING_RATES,
      'Governorate',
      normalizedGovernorate
    );

  if (!existing) {
    const rows =
      await getAllRows(
        SHEET_NAMES.SHIPPING_RATES
      );

    existing =
      rows.find(
        (item) =>
          normalizeGovernorate(
            item.row?.Governorate
          ) === normalizedGovernorate
      );
  }

  if (!existing) {
    throw new Error(
      'Shipping rate not found'
    );
  }

  const headers =
    existing.headers;

  const newRow = [
    ...Object.values(
      existing.row
    ),
  ];

  const activeIndex =
    headers.indexOf(
      'Active'
    );

  const updatedAtIndex =
    headers.indexOf(
      'UpdatedAt'
    );

  if (
    activeIndex >= 0
  ) {
    newRow[
      activeIndex
    ] =
      'false';
  }

  if (
    updatedAtIndex >= 0
  ) {
    newRow[
      updatedAtIndex
    ] =
      new Date().toISOString();
  }

  await updateRow(
    SHEET_NAMES.SHIPPING_RATES,
    existing.rowIndex,
    newRow
  );

  invalidateCache(
    SHEET_NAMES.SHIPPING_RATES
  );

  return {
    success: true,
  };
}


export async function initializeDefaultShippingRates() {
  const rows =
    await getAllRows(
      SHEET_NAMES.SHIPPING_RATES
    );

  const existingGovernorates =
    new Set();

  /*
   * Repair existing corrupted rows.
   */
  for (const item of rows) {
    const row =
      item.row;

    if (
      !row?.Governorate
    ) {
      continue;
    }

    const original =
      String(
        row.Governorate
      ).trim();

    const repaired =
      normalizeGovernorate(
        original
      );

    if (
      !DEFAULT_SHIPPING_RATES[
        repaired
      ]
    ) {
      continue;
    }

    const headers =
      item.headers;

    const newRow = [
      ...Object.values(row),
    ];

    const governorateIndex =
      headers.indexOf(
        'Governorate'
      );

    const shippingFeeIndex =
      headers.indexOf(
        'ShippingFee'
      );

    const activeIndex =
      headers.indexOf(
        'Active'
      );

    const updatedAtIndex =
      headers.indexOf(
        'UpdatedAt'
      );

    let changed =
      false;

    if (
      governorateIndex >= 0 &&
      newRow[
        governorateIndex
      ] !== repaired
    ) {
      newRow[
        governorateIndex
      ] =
        repaired;

      changed = true;
    }

    if (
      activeIndex >= 0 &&
      String(
        newRow[
          activeIndex
        ]
      ) !== 'true'
    ) {
      newRow[
        activeIndex
      ] =
        'true';

      changed = true;
    }

    const currentFee =
      parseFloat(
        row.ShippingFee
      );

    /*
     * Only use default fee if the current
     * Sheet fee is missing/invalid.
     */
    if (
      shippingFeeIndex >= 0 &&
      !Number.isFinite(
        currentFee
      )
    ) {
      newRow[
        shippingFeeIndex
      ] =
        DEFAULT_SHIPPING_RATES[
          repaired
        ];

      changed = true;
    }

    if (
      changed &&
      updatedAtIndex >= 0
    ) {
      newRow[
        updatedAtIndex
      ] =
        new Date().toISOString();
    }

    if (changed) {
      await updateRow(
        SHEET_NAMES.SHIPPING_RATES,
        item.rowIndex,
        newRow
      );
    }

    existingGovernorates.add(
      repaired
    );
  }

  /*
   * Add any missing governorates.
   */
  for (
    const [
      governorate,
      fee,
    ] of Object.entries(
      DEFAULT_SHIPPING_RATES
    )
  ) {
    if (
      !existingGovernorates.has(
        governorate
      )
    ) {
      await setShippingRate(
        governorate,
        fee
      );
    }
  }

  invalidateCache(
    SHEET_NAMES.SHIPPING_RATES
  );

  console.log(
    '✅ Shipping rates initialized and repaired'
  );
}