import {
  getAllRows,
  findRowById,
  appendRow,
  updateRow,
  invalidateCache,
  getNextId,
  deleteRow,
  SHEET_NAMES,
} from './sheets.service.js';


import {
  ORDER_STATUSES,
  GENDERS,
} from '../config/constants.js';


import {
  calculateOrderTotals,
} from '../utils/money.js';


import {
  uploadFile,
} from './drive.service.js';


import * as gmailService from './gmail.service.js';


import {
  getSetting,
} from './settings.service.js';


import {
  getProductById,
} from './product.service.js';


import {
  getShippingRate,
} from './shipping.service.js';

import {
  buildReviewUrl,
} from './review.service.js';

function buildWhatsAppUrl(value, message = '') {
  let phone = String(value || '').replace(/[^0-9+]/g, '');
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0')) phone = `20${phone.slice(1)}`;
  if (!phone.startsWith('20') && /^1[0-2]\d{8}$/.test(phone)) phone = `20${phone}`;
  if (!/^20\d{10}$/.test(phone)) return '';
  const url = new URL(`https://wa.me/${phone}`);
  if (message) url.searchParams.set('text', message);
  return url.toString();
}


export async function createOrder(
  orderData
) {
  const {
    customer,
    paymentMethod,
    notes,
    items,
    platform = 'website',
    language = 'ar',
  } = orderData;


  if (!customer) {
    throw new Error(
      'Customer information is required'
    );
  }


  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      'Order must contain at least one item'
    );
  }


  if (!customer.governorate) {
    throw new Error(
      'Governorate is required'
    );
  }


  if (!paymentMethod) {
    throw new Error(
      'Payment method is required'
    );
  }


  if (
    !customer.email ||
    !String(
      customer.email
    ).trim()
  ) {
    throw new Error(
      'Customer email is required'
    );
  }


  /*
   * Fetch products from the server.
   * Never trust price values coming
   * from the frontend.
   */
  const serverItems = [];


  for (
    const item of items
  ) {
    const product =
      await getProductById(
        item.productId
      );


    if (!product) {
      throw new Error(
        `Product not found: ${item.productId}`
      );
    }


    if (!product.active) {
      throw new Error(
        `Product not available: ${product.name}`
      );
    }


    const quantity =
      Number(
        item.quantity
      );


    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity <= 0
    ) {
      throw new Error(
        `Invalid quantity for product: ${product.name}`
      );
    }


    const unitPrice =
      Number(
        product.sellingPrice
      ) || 0;


    const manufacturingCost =
      Number(
        product.manufacturingCost
      ) || 0;


    serverItems.push({
      productId:
        product.id,

      name:
        product.name,

      quantity,

      unitPrice,

      manufacturingCost,

      lineTotal:
        unitPrice *
        quantity,
    });
  }


  /*
   * Central shipping service.
   */
  const shippingRate =
    await getShippingRate(
      customer.governorate
    );


  const totals =
    await calculateOrderTotals(
      serverItems,
      shippingRate
    );


  const orderId =
    await getNextId(
      'ORD'
    );


  const now =
    new Date().toISOString();


  /*
   * Save pending order.
   */
  await appendRow(
    SHEET_NAMES.PENDING_ORDERS,
    [
      orderId,
      now,

      customer.name,

      customer.email,

      customer.gender === 'male'
        ? GENDERS.MALE
        : GENDERS.FEMALE,

      customer.phone,

      customer.governorate,

      customer.address,

      customer.locationUrl ||
        '',

      platform,

      paymentMethod,

      notes || '',

      totals.subtotal,

      totals.shipping,

      totals.total,

      ORDER_STATUSES.PENDING,

      'website',

      now,

      now,

      language === 'en' ? 'en' : 'ar',
    ]
  );


  /*
   * Save order items.
   */
  for (
    const item of serverItems
  ) {
    await appendRow(
      SHEET_NAMES.ORDER_ITEMS,
      [
        orderId,

        item.productId,

        item.name,

        item.quantity,

        item.unitPrice,

        item.manufacturingCost,

        item.lineTotal,

        now,
      ]
    );
  }


  /*
   * Prepare confirmation email.
   */
  const instapayLink =
    await getSetting(
      'instapay_link'
    );


  const orderForEmail = {
    orderId,

    date:
      now,

    customer,

    paymentMethod,

    items:
      serverItems.map(
        (item) => ({
          name:
            item.name,

          quantity:
            item.quantity,

          unitPrice:
            item.unitPrice,

          totalPrice:
            item.lineTotal,
        })
      ),

    subtotal:
      totals.subtotal,

    shipping:
      totals.shipping,

    total:
      totals.total,

    instapayLink,
    whatsappUrl: buildWhatsAppUrl(await getSetting('whatsapp')),
  };


  /*
   * Email is a secondary operation.
   *
   * The order is already saved in Sheets.
   * If Gmail fails, the order remains valid.
   */
  let emailSent =
    false;

  let emailError =
    null;


  try {
    const emailResult =
      await gmailService.sendOrderConfirmationEmail(
        orderForEmail,
        customer.email,
        language
      );


    emailSent =
      emailResult?.success === true;


    if (!emailSent) {
      emailError =
        emailResult?.error ||
        'Gmail failed to send the confirmation email';

      console.error(
        '❌ Order confirmation email failed:',
        emailError
      );
    } else {
      console.log(
        `✅ Order confirmation email sent to ${customer.email}`
      );
    }

  } catch (error) {
    emailSent =
      false;

    emailError =
      error?.message ||
      'Unknown Gmail error';

    console.error(
      '❌ Order confirmation email exception:',
      emailError
    );
  }


  return {
    orderId,

    status:
      ORDER_STATUSES.PENDING,

    ...totals,

    emailSent,

    /*
     * Only returned when email failed.
     * This helps frontend/admin debugging.
     */
    ...(emailError
      ? {
          emailError,
        }
      : {}),
  };
}


function firstValue(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function normalizePendingRow(entry) {
  const { row, headers = [] } = entry;
  const values = headers.map((h) => row?.[h] ?? '');
  const byIndex = (index) => values[index] ?? '';

  // Supports both the current English schema and legacy Arabic/positional rows.
  let normalized = {
    orderId: firstValue(row, 'OrderID', 'Order ID', 'معرف الطلب'),
    date: firstValue(row, 'Date', 'التاريخ'),
    customerName: firstValue(row, 'CustomerName', 'اسم العميل'),
    customerEmail: firstValue(row, 'CustomerEmail', 'البريد الإلكتروني', 'الإيميل'),
    gender: firstValue(row, 'Gender', 'الجنس'),
    phone: firstValue(row, 'Phone', 'رقم الهاتف', 'الهاتف'),
    governorate: firstValue(row, 'Governorate', 'المحافظة'),
    address: firstValue(row, 'DetailedAddress', 'Address', 'العنوان تفصيلياً', 'العنوان التفصيلي'),
    locationUrl: firstValue(row, 'LocationURL', 'رابط اللوكيشن', 'رابط الموقع'),
    platform: firstValue(row, 'Platform', 'المنصة'),
    paymentMethod: firstValue(row, 'PaymentMethod', 'طريقة الدفع'),
    notes: firstValue(row, 'Notes', 'ملاحظات'),
    subtotal: Number(firstValue(row, 'Subtotal', 'إجمالي السعر', 'المجموع الفرعي')) || 0,
    shippingFee: Number(firstValue(row, 'ShippingFee', 'مصاريف الشحن', 'الشحن')) || 0,
    totalPrice: Number(firstValue(row, 'TotalPrice', 'الإجمالي', 'إجمالي الطلب')) || 0,
    status: firstValue(row, 'Status', 'الحالة') || ORDER_STATUSES.PENDING,
    registeredBy: firstValue(row, 'RegisteredBy', 'سُجل بواسطة', 'المسؤول'),
  };

  // Legacy sheet rows were written against a shorter Arabic header row. Detect them
  // by the email/gender shift and read the original positional values.
  const looksLegacy = !String(normalized.customerEmail).includes('@') && String(normalized.gender).includes('@');
  if (looksLegacy && byIndex(0)) {
    normalized = {
      ...normalized,
      orderId: byIndex(0),
      date: byIndex(1),
      customerName: byIndex(2),
      customerEmail: byIndex(3),
      gender: byIndex(4),
      phone: byIndex(5),
      governorate: byIndex(6),
      address: byIndex(7),
      locationUrl: byIndex(8),
      platform: byIndex(9),
      paymentMethod: byIndex(10),
      notes: byIndex(11),
      subtotal: Number(byIndex(12)) || 0,
      shippingFee: Number(byIndex(13)) || 0,
      totalPrice: Number(byIndex(14)) || 0,
      status: byIndex(15) || ORDER_STATUSES.PENDING,
      registeredBy: byIndex(16),
    };
  }

  return normalized;
}

export async function getPendingOrders() {
  const entries = await getAllRows(SHEET_NAMES.PENDING_ORDERS, true);
  const itemEntries = await getAllRows(SHEET_NAMES.ORDER_ITEMS, true);
  const itemsByOrderId = new Map();

  for (const entry of itemEntries) {
    const row = entry?.row || {};
    const orderId = String(row.OrderID || '').trim();
    if (!orderId) continue;

    const item = {
      productId: row.ProductID || '',
      name: row.ProductNameSnapshot || '',
      quantity: parseInt(row.Quantity, 10) || 1,
      unitPrice: parseFloat(row.UnitPriceSnapshot) || 0,
      manufacturingCost: parseFloat(row.ManufacturingCostSnapshot) || 0,
      lineTotal: parseFloat(row.LineTotal) || 0,
    };

    if (!itemsByOrderId.has(orderId)) itemsByOrderId.set(orderId, []);
    itemsByOrderId.get(orderId).push(item);
  }

  const orders = [];
  for (const entry of entries) {
    const normalized = normalizePendingRow(entry);
    if (!normalized.orderId) continue;

    const orderKey = String(normalized.orderId).trim();
    orders.push({
      ...normalized,
      items: itemsByOrderId.get(orderKey) || [],
      source: 'pending',
    });
  }

  return orders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

export async function getOrderItems(orderId) {
  const entries = await getAllRows(SHEET_NAMES.ORDER_ITEMS, true);

  return entries
    .map(entry => entry?.row || {})
    .filter(row => String(row.OrderID || '').trim() === String(orderId).trim())
    .map(r => ({
        productId:
          r.ProductID,

        name:
          r.ProductNameSnapshot,

        quantity:
          parseInt(
            r.Quantity,
            10
          ) || 1,

        unitPrice:
          parseFloat(
            r.UnitPriceSnapshot
          ) || 0,

        manufacturingCost:
          parseFloat(
            r.ManufacturingCostSnapshot
          ) || 0,

        lineTotal:
          parseFloat(
            r.LineTotal
          ) || 0,
      })
    );
}


export async function updateOrderStatus(
  orderId,
  updates,
  adminUsername
) {
  const order =
    await findRowById(
      SHEET_NAMES.PENDING_ORDERS,
      'OrderID',
      orderId
    );


  if (!order) {
    throw new Error(
      'Order not found'
    );
  }


  const now =
    new Date().toISOString();


  const headers =
    order.headers;


  const newRow = [
    ...Object.values(
      order.row
    ),
  ];


  if (
    updates.status
  ) {
    const index =
      headers.indexOf(
        'Status'
      );

    if (
      index >= 0
    ) {
      newRow[index] =
        updates.status;
    }
  }


  if (
    updates.shippingFee !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'ShippingFee'
      );

    if (
      index >= 0
    ) {
      newRow[index] =
        updates.shippingFee;
    }
  }


  if (
    updates.paymentMethod
  ) {
    const index =
      headers.indexOf(
        'PaymentMethod'
      );

    if (
      index >= 0
    ) {
      newRow[index] =
        updates.paymentMethod;
    }
  }


  if (
    updates.notes !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'Notes'
      );

    if (
      index >= 0
    ) {
      newRow[index] =
        updates.notes;
    }
  }


  const updatedAtIndex =
    headers.indexOf(
      'UpdatedAt'
    );


  if (
    updatedAtIndex >= 0
  ) {
    newRow[
      updatedAtIndex
    ] =
      now;
  }


  await updateRow(
    SHEET_NAMES.PENDING_ORDERS,
    order.rowIndex,
    newRow
  );


  if (
    updates.status ===
      ORDER_STATUSES.ACCEPTED ||
    updates.status ===
      ORDER_STATUSES.DELIVERED ||
    updates.status ===
      ORDER_STATUSES.PROCESSING
  ) {
    await syncToAcceptedOrders(
      orderId,
      updates,
      adminUsername
    );

  } else if (
    updates.status ===
      ORDER_STATUSES.REJECTED ||
    updates.status ===
      ORDER_STATUSES.RETURNED
  ) {

    await removeFromAcceptedOrders(
      orderId
    );


    if (
      updates.status ===
      ORDER_STATUSES.RETURNED
    ) {
      await recordReturn(
        orderId,
        updates.returnReason,
        adminUsername
      );
    }
  }


  invalidateCache(
    SHEET_NAMES.PENDING_ORDERS
  );

  invalidateCache(
    SHEET_NAMES.ACCEPTED_ORDERS
  );

  let deliveredEmail = null;
  if (updates.status === ORDER_STATUSES.DELIVERED && String(order.row.Status || '') !== ORDER_STATUSES.DELIVERED) {
    try {
      const items = await getOrderItems(orderId);
      const language = order.row.Language === 'en' ? 'en' : 'ar';
      const reviewUrl = buildReviewUrl(orderId, order.row.CustomerEmail);
      deliveredEmail = await gmailService.sendDeliveredReviewEmail(
        {
          orderId,
          customerName: order.row.CustomerName,
          customerEmail: order.row.CustomerEmail,
          language,
          items,
          reviewUrl,
          whatsappUrl: buildWhatsAppUrl(await getSetting('whatsapp')),
        },
        order.row.CustomerEmail,
        language
      );
    } catch (error) {
      deliveredEmail = { success: false, error: error?.message || 'Delivered email failed' };
      console.error('❌ Delivered review email failed:', deliveredEmail.error);
    }
  }

  return {
    success: true,
    deliveredEmail,
  };
}


async function syncToAcceptedOrders(
  orderId,
  updates,
  adminUsername
) {
  const pending =
    await findRowById(
      SHEET_NAMES.PENDING_ORDERS,
      'OrderID',
      orderId
    );


  if (!pending) {
    return;
  }


  const items =
    await getOrderItems(
      orderId
    );


  const accepted =
    await findRowById(
      SHEET_NAMES.ACCEPTED_ORDERS,
      'OrderID',
      orderId
    );


  const manufacturingCost =
    items.reduce(
      (sum, item) =>
        sum +
        item.manufacturingCost,
      0
    );


  const subtotal =
    items.reduce(
      (sum, item) =>
        sum +
        item.lineTotal,
      0
    );


  const shipping =
    parseFloat(
      updates.shippingFee ??
      pending.row.ShippingFee ??
      0
    ) || 0;


  const deposit =
    updates.deposit ??
    (
      updates.paymentType ===
      'full'
        ? subtotal
        : (
            updates.depositAmount ||
            0
          )
    );


  const remaining =
    subtotal -
    deposit;


  const totalCosts =
    manufacturingCost +
    shipping;


  const netProfit =
    subtotal -
    totalCosts;


  const teamSize =
    Math.max(
      1,
      parseInt(
        await getSetting(
          'team_size'
        ),
        10
      ) || 5
    );


  const profitPerMember =
    netProfit > 0 &&
    teamSize > 0
      ? netProfit /
        teamSize
      : 0;


  const productsSummary =
    items
      .map(
        (i) => i.name
      )
      .join(', ');


  const quantitySummary =
    items
      .map(
        (i) => i.quantity
      )
      .join(', ');


  const categorySummary =
    items
      .map(
        (i) => i.name
      )
      .join(', ');


  let paymentProofUrl =
    updates.paymentProofUrl ||
    '';


  if (
    updates.paymentProofBase64
  ) {
    paymentProofUrl =
      await uploadFile(
        updates.paymentProofBase64,

        updates.paymentProofFileName ||
          `payment-proof-${orderId}.jpg`,

        'PAYMENT_PROOFS'
      );
  }


  const rowData = [
    orderId,

    new Date().toISOString(),

    pending.row.CustomerName,

    pending.row.CustomerEmail,

    pending.row.Gender,

    pending.row.Phone,

    pending.row.Governorate,

    pending.row.DetailedAddress,

    pending.row.LocationURL,

    productsSummary,

    quantitySummary,

    categorySummary,

    subtotal,

    manufacturingCost,

    shipping,

    deposit,

    remaining,

    totalCosts,

    netProfit,

    profitPerMember,

    updates.paymentMethod ||
      pending.row.PaymentMethod,

    paymentProofUrl,

    updates.status ||
      ORDER_STATUSES.ACCEPTED,

    adminUsername,

    accepted
      ? accepted.row.CreatedAt
      : new Date().toISOString(),

    new Date().toISOString(),

    pending.row.Language || 'ar',
  ];


  if (accepted) {
    await updateRow(
      SHEET_NAMES.ACCEPTED_ORDERS,
      accepted.rowIndex,
      rowData
    );
  } else {
    await appendRow(
      SHEET_NAMES.ACCEPTED_ORDERS,
      rowData
    );
  }
}


async function removeFromAcceptedOrders(
  orderId
) {
  const accepted =
    await findRowById(
      SHEET_NAMES.ACCEPTED_ORDERS,
      'OrderID',
      orderId
    );


  if (accepted) {
    await deleteRow(
      SHEET_NAMES.ACCEPTED_ORDERS,
      accepted.rowIndex
    );
  }
}


async function recordReturn(
  orderId,
  reason,
  adminUsername
) {
  const pending =
    await findRowById(
      SHEET_NAMES.PENDING_ORDERS,
      'OrderID',
      orderId
    );


  if (!pending) {
    return;
  }


  const items =
    await getOrderItems(
      orderId
    );


  const products =
    items
      .map(
        (i) => i.name
      )
      .join(', ');


  await appendRow(
    SHEET_NAMES.RETURNS,
    [
      orderId,

      new Date().toISOString(),

      pending.row.CustomerName,

      products,

      reason ||
        'بدون عيب في المنتج',

      adminUsername,

      new Date().toISOString(),
    ]
  );
}


export async function getAcceptedOrders() {
  /*
   * getAllRows() returns the rows array directly.
   *
   * The previous implementation treated the result as:
   *   { rows: [...] }
   *
   * That made `rows` undefined and caused:
   *   Cannot read properties of undefined (reading 'filter')
   *
   * Keep this defensive so this service also works if a future
   * sheets.service implementation returns { rows: [...] }.
   */
  const result =
    await getAllRows(
      SHEET_NAMES.ACCEPTED_ORDERS,
      true
    );

  const rows = Array.isArray(result)
    ? result
    : Array.isArray(result?.rows)
      ? result.rows
      : [];

  return rows
    .filter(
      (r) =>
        r?.OrderID
    )
    .map(
      (r) => ({
        orderId:
          r.OrderID,

        acceptedDate:
          r.AcceptedDate,

        customerName:
          r.CustomerName,

        customerEmail:
          r.CustomerEmail,

        gender:
          r.Gender,

        phone:
          r.Phone,

        governorate:
          r.Governorate,

        address:
          r.Address,

        locationUrl:
          r.LocationURL,

        productsSummary:
          r.ProductsSummary,

        quantitySummary:
          r.QuantitySummary,

        categorySummary:
          r.CategorySummary,

        revenue:
          parseFloat(
            r.Revenue
          ) || 0,

        manufacturingCost:
          parseFloat(
            r.ManufacturingCost
          ) || 0,

        shippingCost:
          parseFloat(
            r.ShippingCost
          ) || 0,

        deposit:
          parseFloat(
            r.Deposit
          ) || 0,

        remaining:
          parseFloat(
            r.Remaining
          ) || 0,

        totalCosts:
          parseFloat(
            r.TotalCosts
          ) || 0,

        netProfit:
          parseFloat(
            r.NetProfit
          ) || 0,

        profitPerMember:
          parseFloat(
            r.ProfitPerMember
          ) || 0,

        paymentMethod:
          r.PaymentMethod,

        paymentProofUrl:
          r.PaymentProofURL,

        status:
          r.Status,

        responsibleAdmin:
          r.ResponsibleAdmin,
      })
    )
    .sort(
      (a, b) =>
        new Date(
          b.acceptedDate
        ) -
        new Date(
          a.acceptedDate
        )
    );
}


export async function getOrderById(
  orderId
) {
  const pending =
    await findRowById(
      SHEET_NAMES.PENDING_ORDERS,
      'OrderID',
      orderId
    );


  if (pending) {
    const items =
      await getOrderItems(
        orderId
      );

    return {
      ...pending.row,
      items,
      source:
        'pending',
    };
  }


  const accepted =
    await findRowById(
      SHEET_NAMES.ACCEPTED_ORDERS,
      'OrderID',
      orderId
    );


  if (accepted) {
    return {
      ...accepted.row,
      source:
        'accepted',
    };
  }


  return null;
}