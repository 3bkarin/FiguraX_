import { getAllRows, SHEET_NAMES } from './sheets.service.js';
import { ORDER_STATUSES, FUND_TYPES } from '../config/constants.js';
import { getTeamFundSummary } from './fund.service.js';
import { getSetting } from './settings.service.js';

export async function getDashboardMetrics() {
  const acceptedOrders = await getAllRows(
    SHEET_NAMES.ACCEPTED_ORDERS
  );

  const fundTransactions = await getAllRows(
    SHEET_NAMES.FUND
  );

  let totalRevenue = 0;
  let totalPrintingCosts = 0;
  let totalShipping = 0;

  for (const record of acceptedOrders) {
    const row = record.row;

    if (row.Status === ORDER_STATUSES.DELIVERED) {
      totalRevenue += parseFloat(row.Revenue) || 0;
      totalPrintingCosts +=
        parseFloat(row.ManufacturingCost) || 0;
      totalShipping +=
        parseFloat(row.ShippingCost) || 0;
    }
  }

  let totalFund = 0;
  let totalRawMaterialExpenses = 0;

  for (const record of fundTransactions) {
    const row = record.row;

    const amount = parseFloat(row.Amount ?? row['المبلغ'] ?? 0) || 0;

    if (
      (row.Type ?? row['النوع (تمويل/مصروف خامات)']) === FUND_TYPES.RAW_MATERIAL_EXPENSE
    ) {
      totalRawMaterialExpenses += amount;
    } else if (
      (row.Type ?? row['النوع (تمويل/مصروف خامات)']) === FUND_TYPES.CAPITAL_FUNDING
    ) {
      totalFund += amount;
    }
  }

  const totalCosts =
    totalPrintingCosts +
    totalShipping +
    totalRawMaterialExpenses;

  const netProfit = totalRevenue - totalCosts;
  const netProfitPlusFund = netProfit + totalFund;

  const teamSummary = await getTeamFundSummary();

  const configuredTeamSize = Math.max(
    1,
    parseInt(await getSetting('team_size'), 10) || 5
  );

  const activeMembers = configuredTeamSize;

  const profitPerMember =
    netProfit > 0 && activeMembers > 0
      ? netProfit / activeMembers
      : 0;

  return {
    totalRevenue,
    totalPrintingCosts,
    totalShipping,
    totalRawMaterialExpenses,
    totalCosts,
    netProfit,
    netProfitPlusFund,
    profitPerMember,
    totalFund,
    cashBalance: totalRevenue + totalFund - totalPrintingCosts - totalShipping - totalRawMaterialExpenses,
    teamSize: activeMembers,
  };
}

export async function getFinanceChartData() {
  const metrics = await getDashboardMetrics();

  return {
    labels: [
      'Net Profit',
      'Printing Costs',
      'Shipping',
      'Raw Materials',
      'Funding',
    ],

    data: [
      Math.max(0, metrics.netProfit),
      metrics.totalPrintingCosts,
      metrics.totalShipping,
      metrics.totalRawMaterialExpenses,
      metrics.totalFund,
    ],

    colors: ['#e21b2d','#ffffff','#ff3044','#bbbbbb','#e21b2d'],
  };
}

export async function getAnalysisData() {
  const pendingOrders = await getAllRows(
    SHEET_NAMES.PENDING_ORDERS
  );

  const acceptedOrders = await getAllRows(
    SHEET_NAMES.ACCEPTED_ORDERS
  );

  const orderItems = await getAllRows(
    SHEET_NAMES.ORDER_ITEMS
  );

  let deliveredCount = 0;
  let rejectedCount = 0;
  let returnedCount = 0;

  const productSales = {};
  const customerStats = {};
  const locationStats = {};
  const deliveredOrderIds = new Set();

  for (const record of pendingOrders) {
    const row = record.row;

    const status = row.Status;
    const productName = row.Products || '';
    const customerName = row.CustomerName || '';
    const gender = row.Gender || '';
    const address = row.DetailedAddress || '';
    const price = parseFloat(row.TotalPrice) || 0;

    if (status === ORDER_STATUSES.DELIVERED) {
      deliveredCount++;
      if (row.OrderID) deliveredOrderIds.add(String(row.OrderID).trim());
    }

    if (status === ORDER_STATUSES.REJECTED) {
      rejectedCount++;
    }

    if (status === ORDER_STATUSES.RETURNED) {
      returnedCount++;
    }

    const region =
      address.split('-')[0]?.trim() ||
      'غير محدد';

    locationStats[region] =
      (locationStats[region] || 0) + 1;

    if (
      status === ORDER_STATUSES.DELIVERED &&
      customerName
    ) {
      if (!customerStats[customerName]) {
        customerStats[customerName] = {
          name: customerName,
          gender,
          count: 0,
          totalSpent: 0,
          products: {},
        };
      }

      customerStats[customerName].count += 1;

      customerStats[customerName].totalSpent +=
        price;

      customerStats[customerName].products[
        productName
      ] =
        (customerStats[customerName].products[
          productName
        ] || 0) + 1;
    }
  }

  // Best sellers come from the normalized Order_Items sheet because
  // Pending_Orders intentionally does not contain a Products column.
  for (const record of orderItems) {
    const row = record?.row || {};
    const orderId = String(row.OrderID || '').trim();
    if (!orderId || !deliveredOrderIds.has(orderId)) continue;

    const productName = String(row.ProductNameSnapshot || '').trim();
    const quantity = parseInt(row.Quantity, 10) || 0;
    if (!productName || quantity <= 0) continue;

    productSales[productName] =
      (productSales[productName] || 0) + quantity;
  }

  const bestSellers = Object.entries(productSales)
    .map(([product, count]) => ({
      product,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  let bestMale = null;
  let bestFemale = null;
  let topOverall = null;

  let maxMaleSpent = 0;
  let maxFemaleSpent = 0;
  let maxSpent = 0;

  for (const customer of Object.values(
    customerStats
  )) {
    if (customer.totalSpent > maxSpent) {
      maxSpent = customer.totalSpent;
      topOverall = customer;
    }

    if (
      customer.gender === 'ذكر' ||
      customer.gender === 'Male'
    ) {
      if (customer.totalSpent > maxMaleSpent) {
        maxMaleSpent = customer.totalSpent;
        bestMale = customer;
      }
    }

    if (
      customer.gender === 'أنثى' ||
      customer.gender === 'Female'
    ) {
      if (customer.totalSpent > maxFemaleSpent) {
        maxFemaleSpent = customer.totalSpent;
        bestFemale = customer;
      }
    }
  }

  return {
    deliveredCount,
    rejectedCount,
    returnedCount,
    locationStats,
    bestSellers,
    bestMale,
    bestFemale,
    topOverall,
  };
}

export async function getDashboardData() {
  const [
    metrics,
    chartData,
    analysis
  ] = await Promise.all([
    getDashboardMetrics(),
    getFinanceChartData(),
    getAnalysisData(),
  ]);

  return {
    metrics,
    chartData,
    analysis,
  };
}