import { getAllRows, appendRow, SHEET_NAMES } from '../services/sheets.service.js';
import { initializeSheets } from '../services/sheets.service.js';
import { testGoogleConnections } from '../config/google.js';

async function main() {
  console.log('📦 FIGURAX - Data Migration');
  console.log('===========================');

  try {
    console.log('\n🔌 Testing Google API connections...');
    const ok = await testGoogleConnections();
    if (!ok) {
      console.error('❌ Google API connections failed.');
      process.exit(1);
    }

    console.log('\n📊 Initializing sheets...');
    await initializeSheets();

    console.log('\n🔄 Migrating existing data...');

    await migrateCategories();
    await migrateProducts();
    await migratePendingOrders();
    await migrateFundTransactions();
    await migrateReviews();

    console.log('\n✅ Data migration complete!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function migrateCategories() {
  console.log('\n📁 Migrating Categories...');
  const { rows } = await getAllRows(SHEET_NAMES.CATEGORIES);
  console.log(`   Found ${rows.length} categories`);
}

async function migrateProducts() {
  console.log('\n📦 Migrating Products...');
  const { rows } = await getAllRows(SHEET_NAMES.PRODUCTS);
  console.log(`   Found ${rows.length} products`);

  for (const product of rows) {
    if (!product.CategoryID && product.CategoryName) {
      console.log(`   Product ${product.ID} missing CategoryID - would need manual fix`);
    }
  }
}

async function migratePendingOrders() {
  console.log('\n📋 Migrating Pending Orders...');
  const { rows } = await getAllRows(SHEET_NAMES.PENDING_ORDERS);
  console.log(`   Found ${rows.length} pending orders`);

  let migrated = 0;
  for (const order of rows) {
    if (order.OrderID && !await hasOrderItems(order.OrderID)) {
      const productId = await findProductIdByName(order.Products);
      if (productId) {
        await createOrderItems(order.OrderID, [{
          productId,
          productName: order.Products,
          quantity: parseInt(order.Quantity) || 1,
          unitPrice: parseFloat(order.TotalPrice) / (parseInt(order.Quantity) || 1),
          manufacturingCost: 0,
          lineTotal: parseFloat(order.TotalPrice) || 0,
        }]);
        migrated++;
      }
    }
  }
  console.log(`   Created order items for ${migrated} orders`);
}

async function migrateFundTransactions() {
  console.log('\n💰 Migrating Fund Transactions...');
  const { rows } = await getAllRows(SHEET_NAMES.FUND);
  console.log(`   Found ${rows.length} transactions`);
}

async function migrateReviews() {
  console.log('\n⭐ Migrating Reviews...');
  const { rows } = await getAllRows(SHEET_NAMES.REVIEWS);
  console.log(`   Found ${rows.length} reviews`);
}

async function hasOrderItems(orderId) {
  const { rows } = await getAllRows(SHEET_NAMES.ORDER_ITEMS);
  return rows.some(r => r.OrderID === orderId);
}

async function findProductIdByName(name) {
  const { rows } = await getAllRows(SHEET_NAMES.PRODUCTS);
  const product = rows.find(p => p.Name === name);
  return product?.ID || null;
}

async function createOrderItems(orderId, items) {
  for (const item of items) {
    await appendRow(SHEET_NAMES.ORDER_ITEMS, [
      orderId,
      item.productId,
      item.productName,
      item.quantity,
      item.unitPrice,
      item.manufacturingCost,
      item.lineTotal,
      new Date().toISOString(),
    ]);
  }
}

main();