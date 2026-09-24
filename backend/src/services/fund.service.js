import {
  getAllRows,
  findRowById,
  appendRow,
  updateRow,
  invalidateCache,
  getNextId,
  SHEET_NAMES
} from './sheets.service.js';

import { FUND_TYPES } from '../config/constants.js';
import { uploadFile } from './drive.service.js';
import { sendFinancialTransactionEmail } from './gmail.service.js';
import { getUserByUsername, isFinanceAdmin } from './auth.service.js';
import { getSetting } from './settings.service.js';

export async function addFundTransaction(transactionData, adminUser) {
  const {
    name,
    type,
    amount,
    details,
    paymentMethod,
    base64Image,
    fileName,
  } = transactionData;

  let imageUrl = '';

  if (base64Image) {
    try {
      imageUrl = await uploadFile(
        base64Image,
        fileName,
        'FUND_TRANSACTIONS'
      );
    } catch (error) {
      console.error(
        'Fund image upload failed, continuing without image:',
        error.message
      );
      imageUrl = '';
    }
  }

  const id = await getNextId('FND');
  const now = new Date().toISOString();

  await appendRow(SHEET_NAMES.FUND, [
    id,
    now,
    name,
    type,
    parseFloat(amount) || 0,
    details || '',
    paymentMethod || '',
    imageUrl,
    adminUser.username,
    now,
    now,
  ]);

  invalidateCache(SHEET_NAMES.FUND);

  const recipient = await getUserByUsername(name);

  if (recipient?.row?.Email) {
    try {
      await sendFinancialTransactionEmail(
        {
          id,
          date: now,
          name,
          type,
          amount: parseFloat(amount) || 0,
          details,
          paymentMethod,
          imageUrl,
          addedBy: adminUser.username,
        },
        recipient.row.Email,
        'ar'
      );
    } catch (emailError) {
      console.error(
        'Financial email failed:',
        emailError.message
      );
    }
  } else {
    console.warn(
      `Financial transaction email: no user found with username '${name}'`
    );
  }

  return {
    success: true,
    id
  };
}

export async function getFundTransactions(filters = {}) {
  const records = await getAllRows(SHEET_NAMES.FUND);

  let transactions = records
    .map(record => record.row)
    .filter(row => row.ID)
    .map(row => ({
      id: row.ID,

      // الأعمدة الفعلية في Google Sheet بالعربي
      date:
        row['التاريخ'] ||
        row.Date ||
        '',

      name:
        row['الاسم'] ||
        row.Name ||
        '',

      type:
        row['النوع (تمويل/مصروف خامات)'] ||
        row.Type ||
        '',

      amount:
        parseFloat(
          row['المبلغ'] ??
          row.Amount ??
          0
        ) || 0,

      details:
        row['التفاصيل'] ||
        row.Details ||
        '',

      paymentMethod:
        row['طريقة الدفع'] ||
        row.PaymentMethod ||
        '',

      imageUrl:
        row['صورة المعاملة'] ||
        row.ImageURL ||
        '',

      addedBy:
        row.AddedBy ||
        ''
    }));

  if (filters.name && filters.name !== 'ALL') {
    transactions = transactions.filter(
      transaction =>
        String(transaction.name || '')
          .trim()
          .toLowerCase() ===
        String(filters.name)
          .trim()
          .toLowerCase()
    );
  }

  if (filters.type && filters.type !== 'ALL') {
    transactions = transactions.filter(
      transaction =>
        transaction.type === filters.type
    );
  }

  return transactions.sort(
    (a, b) =>
      new Date(b.date) -
      new Date(a.date)
  );
}

export async function getTeamFundSummary() {
  const transactions =
    await getFundTransactions();

  const configuredTeamSize = Math.max(
    1,
    parseInt(
      await getSetting('team_size'),
      10
    ) || 5
  );

  const userRecords =
    await getAllRows(SHEET_NAMES.USERS);

  const activeUsernames = userRecords
    .map(record => record.row)
    .filter(
      user =>
        user.Active !== 'false' &&
        user.Username
    )
    .map(user =>
      String(user.Username).trim()
    )
    .filter(Boolean);

  const transactionMembers = transactions
    .map(transaction => transaction.name)
    .filter(Boolean);

  const members = [
    ...new Set([
      ...activeUsernames,
      ...transactionMembers
    ])
  ].slice(0, configuredTeamSize);

  const summary = {};

  for (const member of members) {
    summary[member] = {
      expenses: 0,
      fund: 0
    };
  }

  for (const transaction of transactions) {
    const member = members.find(
      m =>
        m.toLowerCase() ===
        String(transaction.name)
          .trim()
          .toLowerCase()
    );

    if (!member) continue;

    const type =
      String(transaction.type || '')
        .trim();

    // تمويل
    if (
      type === 'تمويل' ||
      type === 'تمويل رأس مال' ||
      type ===
        String(FUND_TYPES.CAPITAL_FUNDING)
    ) {
      summary[member].fund +=
        transaction.amount;
    }

    // مصروف خامات
    else if (
      type === 'مصروف خامات' ||
      type ===
        String(FUND_TYPES.RAW_MATERIAL_EXPENSE)
    ) {
      summary[member].expenses +=
        transaction.amount;
    }
  }

  return summary;
}

export async function updateFundTransaction(
  transactionId,
  updates,
  adminUser
) {
  if (!isFinanceAdmin(adminUser)) {
    throw new Error(
      'Only Mahrous can edit financial transactions'
    );
  }

  const transaction =
    await findRowById(
      SHEET_NAMES.FUND,
      'ID',
      transactionId
    );

  if (!transaction) {
    throw new Error(
      'Transaction not found'
    );
  }

  const headers =
    transaction.headers;

  const newRow =
    headers.map(
      header =>
        transaction.row[header] ?? ''
    );

  if (updates.type) {
    const typeIndex =
      headers.indexOf(
        'النوع (تمويل/مصروف خامات)'
      );

    if (typeIndex !== -1) {
      newRow[typeIndex] =
        updates.type;
    } else {
      const oldTypeIndex =
        headers.indexOf('Type');

      if (oldTypeIndex !== -1) {
        newRow[oldTypeIndex] =
          updates.type;
      }
    }
  }

  if (updates.amount !== undefined) {
    const amountIndex =
      headers.indexOf('المبلغ');

    if (amountIndex !== -1) {
      newRow[amountIndex] =
        parseFloat(updates.amount) || 0;
    } else {
      const oldAmountIndex =
        headers.indexOf('Amount');

      if (oldAmountIndex !== -1) {
        newRow[oldAmountIndex] =
          parseFloat(updates.amount) || 0;
      }
    }
  }

  if (updates.details) {
    const detailsIndex =
      headers.indexOf('التفاصيل');

    if (detailsIndex !== -1) {
      newRow[detailsIndex] =
        updates.details;
    } else {
      const oldDetailsIndex =
        headers.indexOf('Details');

      if (oldDetailsIndex !== -1) {
        newRow[oldDetailsIndex] =
          updates.details;
      }
    }
  }

  if (updates.paymentMethod) {
    const paymentIndex =
      headers.indexOf('طريقة الدفع');

    if (paymentIndex !== -1) {
      newRow[paymentIndex] =
        updates.paymentMethod;
    } else {
      const oldPaymentIndex =
        headers.indexOf(
          'PaymentMethod'
        );

      if (oldPaymentIndex !== -1) {
        newRow[oldPaymentIndex] =
          updates.paymentMethod;
      }
    }
  }

  const updatedAtIndex =
    headers.indexOf('UpdatedAt');

  if (updatedAtIndex !== -1) {
    newRow[updatedAtIndex] =
      new Date().toISOString();
  }

  await updateRow(
    SHEET_NAMES.FUND,
    transaction.rowIndex,
    newRow
  );

  invalidateCache(
    SHEET_NAMES.FUND
  );

  return {
    success: true
  };
}

export async function getFundTransactionById(
  transactionId
) {
  const transaction =
    await findRowById(
      SHEET_NAMES.FUND,
      'ID',
      transactionId
    );

  if (!transaction) {
    return null;
  }

  const row =
    transaction.row;

  return {
    id: row.ID,

    date:
      row['التاريخ'] ||
      row.Date ||
      '',

    name:
      row['الاسم'] ||
      row.Name ||
      '',

    type:
      row['النوع (تمويل/مصروف خامات)'] ||
      row.Type ||
      '',

    amount:
      parseFloat(
        row['المبلغ'] ??
        row.Amount ??
        0
      ) || 0,

    details:
      row['التفاصيل'] ||
      row.Details ||
      '',

    paymentMethod:
      row['طريقة الدفع'] ||
      row.PaymentMethod ||
      '',

    imageUrl:
      row['صورة المعاملة'] ||
      row.ImageURL ||
      '',

    addedBy:
      row.AddedBy ||
      ''
  };
}