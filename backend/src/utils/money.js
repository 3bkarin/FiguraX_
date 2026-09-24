export function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function roundAmount(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatAmount(value, currency = 'EGP', language = 'ar') {
  const num = parseAmount(value);
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export async function calculateOrderTotals(items, shippingFee = 0) {
  let subtotal = 0;
  let totalManufacturingCost = 0;

  for (const item of items) {
    const quantity = parseInt(item.quantity) || 1;
    const unitPrice = parseAmount(item.unitPrice || item.sellingPrice);
    const manufacturingCost = parseAmount(item.manufacturingCost);

    subtotal += unitPrice * quantity;
    totalManufacturingCost += manufacturingCost * quantity;
  }

  const shipping = parseAmount(shippingFee);
  const total = subtotal + shipping;

  return {
    subtotal: roundAmount(subtotal),
    shipping: roundAmount(shipping),
    total: roundAmount(total),
    manufacturingCost: roundAmount(totalManufacturingCost),
  };
}

export function calculateNetProfit(revenue, manufacturingCost, shippingCost, rawMaterialExpenses) {
  const totalCosts = manufacturingCost + shippingCost + rawMaterialExpenses;
  return roundAmount(revenue - totalCosts);
}

export function calculateProfitPerMember(netProfit, teamSize = 5) {
  if (netProfit <= 0 || teamSize <= 0) return 0;
  return roundAmount(netProfit / teamSize);
}

// Alias for test compatibility
export const formatCurrency = formatAmount;