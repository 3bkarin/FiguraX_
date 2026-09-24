import { authApi, adminApi } from './api.js';
import { t, initLanguage, loadTranslations, translatePage, onLanguageChange, getLanguage, setLanguage } from './i18n.js';
import { showToast, escapeHtml, formatCurrency, sanitizeUrl, getPublicImageUrl, getPrivateFileUrl } from './common.js';

let currentUser = null;
let isFinanceAdmin = false;
let allOrders = [];
let allFundTransactions = [];
let financeChart = null;

async function loadLanguage(lang) {
  try {
    const response = await fetch(`locales/${lang}.json`);
    const data = await response.json();
    loadTranslations(lang, data);
    translatePage();
  } catch (error) {
    console.error('Failed to load language:', error);
  }
}

async function init() {
  initLanguage();
  await loadLanguage(getLanguage());

  onLanguageChange(async (lang) => {
    await loadLanguage(lang);
    refreshCurrentSection();
  });

  setupMobileSidebar();
  checkAuth();
}

function setupMobileSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('adminSidebar');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 992 && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
      sidebar?.classList.remove('open');
    }
  });
}

async function checkAuth() {
  try {
    const response = await authApi.me();
    if (response.data.authenticated && response.data.user) {
      currentUser = response.data.user;
      isFinanceAdmin = currentUser.isMahrous === true;

      document.getElementById('currentUserDisplay').textContent = currentUser.username;
      document.getElementById('userInfoHeader').classList.remove('hidden');
      document.getElementById('loginSection').classList.add('hidden');
      document.getElementById('mainDashboard').classList.remove('hidden');
      document.getElementById('sidebarToggle').style.display = 'flex';

      const editFundBtn = document.getElementById('editFundBtn');
      if (isFinanceAdmin) {
        editFundBtn.classList.remove('hidden');
      }

      loadDashboard();
    } else {
      showLogin();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showLogin();
  }
}

function showLogin() {
  document.getElementById('mainDashboard').classList.add('hidden');
  document.getElementById('userInfoHeader').classList.add('hidden');
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('sidebarToggle').style.display = 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUserSelect').value;
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showAlert('loginAlert', t('common.required') || 'يرجى ملء جميع الحقول', 'error');
    return;
  }

  try {
    const response = await authApi.login(username, password);
    currentUser = response.data.user;
    isFinanceAdmin = currentUser.isMahrous === true;

    document.getElementById('currentUserDisplay').textContent = currentUser.username;
    document.getElementById('userInfoHeader').classList.remove('hidden');
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
    document.getElementById('sidebarToggle').style.display = 'flex';

    const editFundBtn = document.getElementById('editFundBtn');
    if (isFinanceAdmin) {
      editFundBtn.classList.remove('hidden');
    }

    document.getElementById('loginForm').reset();
    showAlert('loginAlert', '', 'hidden');
    loadDashboard();
  } catch (error) {
    showAlert('loginAlert', error.message || t('admin.invalidCredentials') || 'بيانات دخول غير صحيحة', 'error');
  }
}

function logout() {
  authApi.logout().finally(() => {
    currentUser = null;
    isFinanceAdmin = false;
    showLogin();
  });
}

function showSection(sectionName, btn) {
  document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const sections = ['Dashboard', 'Categories', 'Products', 'Orders', 'Fund', 'Analysis', 'Settings', 'Reviews'];
  sections.forEach(s => {
    const el = document.getElementById('section' + s);
    if (el) el.classList.add('hidden');
  });

  const target = document.getElementById('section' + sectionName.charAt(0).toUpperCase() + sectionName.slice(1));
  if (target) target.classList.remove('hidden');

  refreshCurrentSection();
}

function refreshCurrentSection() {
  const activeLink = document.querySelector('.admin-nav-link.active');
  if (!activeLink) return;

  const section = activeLink.getAttribute('onclick')?.match(/showSection\('(\w+)'/)?.[1];
  if (!section) return;

  switch (section) {
    case 'dashboard': loadDashboard(); break;
    case 'categories': loadCategories(); break;
    case 'products': loadProducts(); break;
    case 'orders': loadOrders(); break;
    case 'fund': loadFund(); break;
    case 'analysis': loadAnalysis(); break;
    case 'settings': loadSettings(); break;
    case 'reviews': loadReviews(); break;
  }
}

function showAlert(elementId, message, type = 'info') {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (type === 'hidden' || !message) {
    el.hidden = true;
    el.textContent = '';
    return;
  }

  el.hidden = false;
  el.textContent = message;
  el.style.background = type === 'error' ? 'rgba(230,57,70,0.1)' : 'rgba(46,196,182,0.1)';
  el.style.borderColor = type === 'error' ? 'var(--admin-error)' : 'var(--admin-success)';
  el.style.color = type === 'error' ? 'var(--admin-error)' : 'var(--admin-success)';
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('show'));
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.hidden = true;
      document.body.style.overflow = '';
    }, 300);
  }
}

function previewImage(input, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview || !input.files[0]) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.classList.add('visible');
  };
  reader.readAsDataURL(input.files[0]);
}

function getBase64Image(inputId) {
  return new Promise((resolve) => {
    const input = document.getElementById(inputId);
    if (!input?.files[0]) return resolve(null);

    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(input.files[0]);
  });
}

// Dashboard
async function loadDashboard() {
  showAlert('globalAlert', '', 'hidden');
  try {
    const response = await adminApi.dashboard();
    const { metrics, chartData } = response.data;

    document.getElementById('statRevenue').textContent = formatCurrency(metrics.totalRevenue);
    document.getElementById('statPrintingCosts').textContent = formatCurrency(metrics.totalPrintingCosts);
    document.getElementById('statShippingCosts').textContent = formatCurrency(metrics.totalShipping);
    document.getElementById('statRawMaterial').textContent = formatCurrency(metrics.totalRawMaterialExpenses);
    document.getElementById('statNetProfit').textContent = formatCurrency(metrics.netProfit);
    document.getElementById('statTotalFunding').textContent = formatCurrency(metrics.totalFund);
    document.getElementById('statProfitPerMember').textContent = formatCurrency(metrics.profitPerMember);
    const cashBalance = document.getElementById('statCashBalance');
    if (cashBalance) cashBalance.textContent = formatCurrency(metrics.cashBalance ?? (metrics.netProfit + metrics.totalFund));

    renderFinanceChart(chartData);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    showAlert('globalAlert', error.message || 'فشل تحميل لوحة التحكم', 'error');
  }
}

function renderFinanceChart(chartData) {
  const ctx = document.getElementById('financeChart')?.getContext('2d');
  if (!ctx) return;

  if (financeChart) financeChart.destroy();

  financeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.labels,
      datasets: [{
        data: chartData.data,
        backgroundColor: chartData.colors,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: 'var(--admin-text)', font: { size: 14, weight: 'bold' }, padding: 20 },
        },
      },
    },
  });
}

// Categories
async function loadCategories() {
  try {
    const response = await adminApi.categories.list();
    const categories = response.data;

    const tbody = document.getElementById('categoriesTableBody');
    tbody.innerHTML = categories.map(cat => `
      <tr>
        <td>${escapeHtml(cat.id)}</td>
        <td>${escapeHtml(cat.name)}</td>
        <td>${escapeHtml(cat.description || '-')}</td>
        <td><span class="badge badge-primary">${cat.productCount || 0}</span></td>
        <td>
          <button class="admin-btn admin-btn-secondary btn-sm" data-admin-action="edit-category" data-id="${escapeHtml(cat.id)}"><i class="fa-solid fa-pen"></i></button>
          <button class="admin-btn admin-btn-danger btn-sm" data-admin-action="delete-category" data-id="${escapeHtml(cat.id)}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Failed to load categories:', error);
    showAlert('globalAlert', error.message, 'error');
  }
}

function openCategoryModal(category = null) {
  const form = document.getElementById('categoryForm');
  form.reset();
  document.getElementById('categoryModalTitle').textContent = category ? t('admin.editCategory') : t('admin.addCategory');
  form.dataset.editingId = category?.id || '';

  if (category) {
    document.getElementById('catName').value = category.name;
    document.getElementById('catDesc').value = category.description || '';
  }

  openModal('categoryModal');
}

async function submitCategory() {
  const form = document.getElementById('categoryForm');
  const editingId = form.dataset.editingId;
  const name = document.getElementById('catName').value.trim();
  const description = document.getElementById('catDesc').value.trim();

  if (!name) return showToast(t('common.required'), 'error');

  try {
    if (editingId) {
      await adminApi.categories.update(editingId, { name, description });
      showToast(t('common.saved') || 'تم الحفظ', 'success');
    } else {
      await adminApi.categories.create({ name, description });
      showToast(t('common.added') || 'تم الإضافة', 'success');
    }
    closeModal('categoryModal');
    loadCategories();
    loadProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function editCategory(id) {
  try {
    const categories = await adminApi.categories.list();
    const category = categories.data.find(c => c.id === id);
    if (category) openCategoryModal(category);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm(t('common.confirmDelete') || 'هل أنت متأكد من الحذف؟')) return;
  try {
    await adminApi.categories.delete(id);
    showToast(t('common.deleted') || 'تم الحذف', 'success');
    loadCategories();
    loadProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Products
async function loadProducts() {
  try {
    const response = await adminApi.products.list();
    const products = response.data;

    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${escapeHtml(p.id)}</td>
        <td>${escapeHtml(p.categoryName)}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.dimensions || '-')}</td>
        <td>${p.weight || 0} جم</td>
        <td>${p.infillPercent || 0}%</td>
        <td>${escapeHtml(p.material || '-')}</td>
        <td>${formatCurrency(p.manufacturingCost)}</td>
        <td>
          ${p.originalPrice && Number(p.originalPrice) > Number(p.sellingPrice)
            ? `<div><del style="color:var(--admin-text-muted);">${formatCurrency(p.originalPrice)}</del><br><strong>${formatCurrency(p.sellingPrice)}</strong></div>`
            : formatCurrency(p.sellingPrice)}
        </td>
        <td>
          <button class="admin-btn admin-btn-secondary btn-sm" data-admin-action="edit-product" data-id="${escapeHtml(p.id)}"><i class="fa-solid fa-pen"></i></button>
          <button class="admin-btn admin-btn-danger btn-sm" data-admin-action="delete-product" data-id="${escapeHtml(p.id)}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');

    const categorySelect = document.getElementById('prdCategory');
    const categories = await adminApi.categories.list();
    categorySelect.innerHTML = `<option value="">-- اختر التصنيف --</option>` +
      categories.data.map(c => `<option value="${escapeHtml(c.id)}" data-name="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  } catch (error) {
    console.error('Failed to load products:', error);
    showAlert('globalAlert', error.message, 'error');
  }
}

function readCustomizationSchema() {
  const raw = document.getElementById('prdCustomizationSchema')?.value || '';
  if (!raw.trim()) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : (parsed.fields || []); } catch { return []; }
}

function syncCustomizationSchema() {
  const rows = [...document.querySelectorAll('.custom-field-row')];
  const fields = rows.map((row, index) => {
    const id = row.querySelector('[data-field="id"]')?.value.trim() || `field_${index + 1}`;
    const labelAr = row.querySelector('[data-field="labelAr"]')?.value.trim() || id;
    const labelEn = row.querySelector('[data-field="labelEn"]')?.value.trim() || labelAr;
    const type = row.querySelector('[data-field="type"]')?.value || 'text';
    const required = row.querySelector('[data-field="required"]')?.checked || false;
    const placeholderAr = row.querySelector('[data-field="placeholderAr"]')?.value.trim() || '';
    const placeholderEn = row.querySelector('[data-field="placeholderEn"]')?.value.trim() || '';
    const options = [...row.querySelectorAll('[data-option]')].map(i => i.value.trim()).filter(Boolean);
    const field = { id, labelAr, labelEn, type, required };
    if (placeholderAr) field.placeholderAr = placeholderAr;
    if (placeholderEn) field.placeholderEn = placeholderEn;
    if (type === 'select') field.options = options;
    return field;
  });
  const target = document.getElementById('prdCustomizationSchema');
  if (target) target.value = JSON.stringify(fields);
  return fields;
}

function renderCustomizationFields(schema = []) {
  const container = document.getElementById('customizationFields');
  if (!container) return;
  container.innerHTML = '';
  (schema || []).forEach(field => addCustomizationField(field));
  syncCustomizationSchema();
}

function addCustomizationField(field = {}) {
  const container = document.getElementById('customizationFields');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'custom-field-row';
  row.innerHTML = `
    <div class="field-mini"><label>الاسم الداخلي</label><input data-field="id" value="${escapeHtml(field.id || '')}" placeholder="name"></div>
    <div class="field-mini"><label>الاسم بالعربي</label><input data-field="labelAr" value="${escapeHtml(field.labelAr || '')}" placeholder="الاسم"></div>
    <div class="field-mini"><label>النوع</label><select data-field="type"><option value="text">نص</option><option value="textarea">نص طويل</option><option value="number">رقم</option><option value="select">اختيارات</option><option value="color">لون</option><option value="checkbox">نعم / لا</option></select></div>
    <div class="field-mini"><label>مطلوب؟</label><label style="display:flex;align-items:center;gap:6px;height:40px"><input type="checkbox" data-field="required" ${field.required ? 'checked' : ''}> نعم</label></div>
    <div class="field-mini"><label>الاسم بالإنجليزي</label><input data-field="labelEn" value="${escapeHtml(field.labelEn || '')}" placeholder="Name"></div>
    <div class="field-mini"><label>Placeholder عربي</label><input data-field="placeholderAr" value="${escapeHtml(field.placeholderAr || '')}"></div>
    <div class="field-mini"><label>Placeholder English</label><input data-field="placeholderEn" value="${escapeHtml(field.placeholderEn || '')}"></div>
    <button type="button" class="remove-field" title="حذف"><i class="fa-solid fa-trash"></i></button>
    <div class="custom-field-options ${field.type === 'select' ? '' : 'hidden'}"></div>`;
  container.appendChild(row);
  const typeSelect = row.querySelector('[data-field="type"]');
  typeSelect.value = field.type || 'text';
  const optionsBox = row.querySelector('.custom-field-options');
  const renderOptions = () => {
    const type = typeSelect.value;
    optionsBox.classList.toggle('hidden', type !== 'select');
    if (type === 'select') {
      const opts = Array.isArray(field.options) ? field.options : [];
      optionsBox.innerHTML = `<label style="color:#bbb;font-size:12px">الاختيارات</label>${opts.map(v=>`<div class="custom-option-row"><input data-option value="${escapeHtml(typeof v === 'string' ? v : (v.value || v.label || ''))}"><button type="button" class="remove-field" data-remove-option>×</button></div>`).join('')}<button type="button" class="admin-btn admin-btn-secondary btn-sm" data-add-option><i class="fa-solid fa-plus"></i> إضافة اختيار</button>`;
      optionsBox.querySelector('[data-add-option]')?.addEventListener('click',()=>{const d=document.createElement('div');d.className='custom-option-row';d.innerHTML='<input data-option placeholder="اختيار جديد"><button type="button" class="remove-field" data-remove-option>×</button>';optionsBox.insertBefore(d, optionsBox.querySelector('[data-add-option]'));d.querySelector('input').focus();syncCustomizationSchema();});
      optionsBox.querySelectorAll('[data-remove-option]').forEach(b=>b.addEventListener('click',()=>{b.parentElement.remove();syncCustomizationSchema();}));
    }
    syncCustomizationSchema();
  };
  typeSelect.addEventListener('change', renderOptions);
  row.querySelector('.remove-field').addEventListener('click',()=>{row.remove();syncCustomizationSchema();});
  row.querySelectorAll('input').forEach(i=>i.addEventListener('input',syncCustomizationSchema));
  renderOptions();
}

function openProductModal(product = null) {
  const form = document.getElementById('productForm');
  form.reset();
  document.getElementById('productModalTitle').textContent = product ? t('admin.editProduct') : t('admin.addProduct');
  form.dataset.editingId = product?.id || '';
  document.getElementById('prdImagePreview').classList.remove('visible');
  renderCustomizationFields([]);

  if (product) {
    document.getElementById('prdCategory').value = product.categoryId || '';
    if (!document.getElementById('prdCategory').value && product.categoryName) {
      const option = [...document.getElementById('prdCategory').options].find(o => o.dataset.name === product.categoryName);
      if (option) document.getElementById('prdCategory').value = option.value;
    }
    document.getElementById('prdName').value = product.name;
    document.getElementById('prdDescription').value = product.description || '';
    document.getElementById('prdDimensions').value = product.dimensions || '';
    document.getElementById('prdWeight').value = product.weight || '';
    document.getElementById('prdInfill').value = product.infillPercent || '';
    document.getElementById('prdMaterial').value = product.material || '';
    document.getElementById('prdManufacturingCost').value = product.manufacturingCost || '';
    document.getElementById('prdSellingPrice').value = product.sellingPrice || '';
    document.getElementById('prdOriginalPrice').value = product.originalPrice || '';
    document.getElementById('prdSlug').value = product.slug || '';
    document.getElementById('prdProductType').value = product.productType || '';
    document.getElementById('prdFeatured').checked = Boolean(product.featured);
    document.getElementById('prdCustomizable').checked = Boolean(product.customizable);
    const schema = typeof product.customizationSchema === 'string' ? (() => { try { return JSON.parse(product.customizationSchema || '[]'); } catch { return []; } })() : (product.customizationSchema || []);
    renderCustomizationFields(schema);
    if (product.imageUrl) {
      document.getElementById('prdImagePreview').src = getPublicImageUrl(product.imageUrl);
      document.getElementById('prdImagePreview').classList.add('visible');
    }
  }

  openModal('productModal');
}

async function submitProduct() {
  const form =
    document.getElementById('productForm');

  const editingId =
    form.dataset.editingId;

  /* =========================
     CATEGORY
  ========================= */

  const categorySelect =
    document.getElementById('prdCategory');

  const categoryOption =
    categorySelect.options[
      categorySelect.selectedIndex
    ];

  const categoryId =
    categorySelect.value;

  const categoryName =
    categoryOption?.dataset.name || '';

  /* =========================
     IMAGE FILE
  ========================= */

  const imageInput =
    document.getElementById('prdImage');

  const selectedFile =
    imageInput?.files?.[0] || null;

  /* =========================
     PRODUCT DATA
  ========================= */

  const data = {
    categoryId,

    categoryName,

    name:
      document
        .getElementById('prdName')
        .value
        .trim(),

    description:
      document
        .getElementById('prdDescription')
        .value
        .trim(),

    dimensions:
      document
        .getElementById('prdDimensions')
        .value
        .trim(),

    weight:
      parseFloat(
        document
          .getElementById('prdWeight')
          .value
      ) || 0,

    infillPercent:
      parseInt(
        document
          .getElementById('prdInfill')
          .value
      ) || 0,

    material:
      document
        .getElementById('prdMaterial')
        .value
        .trim(),

    manufacturingCost:
      parseFloat(
        document
          .getElementById(
            'prdManufacturingCost'
          )
          .value
      ) || 0,

    sellingPrice:
      parseFloat(
        document
          .getElementById(
            'prdSellingPrice'
          )
          .value
      ) || 0,

    originalPrice:
      parseFloat(
        document
          .getElementById('prdOriginalPrice')
          .value
      ) || 0,

    slug:
      String(
        document.getElementById('prdSlug').value || ''
      ).trim(),

    productType:
      String(
        document.getElementById('prdProductType').value || ''
      ).trim(),

    featured:
      document.getElementById('prdFeatured').checked,

    customizable:
      document.getElementById('prdCustomizable').checked,

    customizationSchema: JSON.stringify(syncCustomizationSchema()),
  };

  /* =========================
     REQUIRED VALIDATION
  ========================= */

  if (!data.name || !categoryId) {
    return showToast(
      t('common.required'),
      'error'
    );
  }

  try {

    /* =========================
       UPLOAD PRODUCT IMAGE
       ========================= */

    if (selectedFile) {

      showToast(
        'جاري رفع صورة المنتج...',
        'info'
      );

      const base64Image =
        await getBase64Image(
          'prdImage'
        );

      if (!base64Image) {
        throw new Error(
          'فشل قراءة صورة المنتج'
        );
      }

      /*
       * uploadImage بيرجع الـ URL فقط
       * بسبب التعديل في api.js
       */

      const imageUrl =
        await adminApi.products.uploadImage({
          base64Image,
          fileName: selectedFile.name,
          folderType: 'PRODUCTS',
        });

      if (!imageUrl) {
        throw new Error(
          'تم رفع الصورة ولكن لم يتم الحصول على رابط الصورة'
        );
      }

      /*
       * مهم:
       * هنا imageUrl String
       * وليس response object
       */

      data.imageUrl = imageUrl;

      console.log(
        'Product image uploaded:',
        data.imageUrl
      );
    }

    /* =========================
       UPDATE EXISTING PRODUCT
    ========================= */

    if (editingId) {

      await adminApi.products.update(
        editingId,
        data
      );

      showToast(
        t('common.saved') || 'تم الحفظ',
        'success'
      );

    }

    /* =========================
       CREATE NEW PRODUCT
    ========================= */

    else {

      await adminApi.products.create(
        data
      );

      showToast(
        t('common.added') || 'تم الإضافة',
        'success'
      );
    }

    /* =========================
       CLOSE + REFRESH
    ========================= */

    closeModal('productModal');

    await loadProducts();

  } catch (error) {

    console.error(
      'Failed to save product:',
      error
    );

    showToast(
      error.message ||
        'حدث خطأ أثناء حفظ المنتج',
      'error'
    );
  }
}

async function editProduct(id) {
  try {
    const response = await adminApi.products.get(id);
    openProductModal(response.data);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm(t('common.confirmDelete'))) return;
  try {
    await adminApi.products.delete(id);
    showToast(t('common.deleted'), 'success');
    loadProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Orders
async function loadOrders() {
  try {
    const response = await adminApi.orders.list();
    const payload = response?.data || {};
    const pending = Array.isArray(payload.pending) ? payload.pending : [];
    const accepted = Array.isArray(payload.accepted) ? payload.accepted : [];
    const combined = Array.isArray(payload.orders) ? payload.orders : [];
    allOrders = combined.length ? combined : [...pending, ...accepted];
    renderOrdersTable(allOrders);
  } catch (error) {
    console.error('Failed to load orders:', error);
    showAlert('globalAlert', error.message, 'error');
  }
}

function filterOrders() {
  const statusFilter = document.getElementById('orderStatusFilter').value;
  const sourceFilter = document.getElementById('orderSourceFilter').value;

  let filtered = allOrders;

  if (statusFilter !== 'ALL') {
    filtered = filtered.filter(o => o.status === statusFilter);
  }
  if (sourceFilter !== 'ALL') {
    filtered = filtered.filter(o => o.platform === sourceFilter);
  }

  renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = orders.length ? orders.map(o => `
    <tr>
      <td>${escapeHtml(o.orderId)}</td>
      <td>${escapeHtml(o.customerName)} (${escapeHtml(o.customerEmail)})</td>
      <td>${escapeHtml(o.phone)}</td>
      <td>${escapeHtml(o.governorate)}</td>
      <td>${o.items?.map(i => `${escapeHtml(i.name)} (${Number(i.quantity) || 0})`).join(', ') || escapeHtml(o.productsSummary || '-')}</td>
      <td>${formatCurrency(o.totalPrice || o.revenue)}</td>
      <td><span class="badge badge-${getStatusBadgeClass(o.status)}">${escapeHtml(t('admin.' + o.status.toLowerCase()) || o.status)}</span></td>
      <td>${escapeHtml(o.platform)}</td>
      <td>
        <button class="admin-btn admin-btn-secondary btn-sm" data-admin-action="edit-order" data-id="${escapeHtml(o.orderId)}"><i class="fa-solid fa-pen"></i></button>
        ${o.locationUrl ? `<a href="${sanitizeUrl(o.locationUrl)}" target="_blank" class="admin-btn admin-btn-info btn-sm"><i class="fa-solid fa-map"></i></a>` : ''}
      </td>
    </tr>
  `).join('') : `<tr><td colspan="9" style="padding:28px;color:#aaa">لا توجد أوردرات مسجلة حاليًا</td></tr>`;
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Delivered': return 'success';
    case 'Accepted': return 'primary';
    case 'Processing': return 'warning';
    case 'Pending': return 'neutral';
    case 'Returned': return 'warning';
    case 'Rejected': return 'error';
    default: return 'neutral';
  }
}

function openEditOrder(orderId) {
  const order = allOrders.find(o => o.orderId === orderId);
  if (!order) return;

  document.getElementById('editOrderId').value = orderId;
  document.getElementById('editOrderStatus').value = order.status;
  document.getElementById('editOrderShipping').value = order.shippingFee || 0;
  document.getElementById('editOrderPayment').value = order.paymentMethod || 'cash_on_delivery';
  document.getElementById('editOrderDeposit').value = order.deposit || 0;
  document.getElementById('editOrderReturnReason').value = '';

  toggleEditOrderFields();
  openModal('editOrderModal');
}

function toggleEditOrderFields() {
  const status = document.getElementById('editOrderStatus').value;
  const isProcessing = ['Accepted', 'Delivered', 'Processing'].includes(status);
  const isReturned = status === 'Returned';

  document.getElementById('editShippingGroup').hidden = !isProcessing;
  document.getElementById('editPaymentGroup').hidden = !isProcessing;
  document.getElementById('editDepositGroup').hidden = !isProcessing;
  document.getElementById('editProofGroup').hidden = !isProcessing;
  document.getElementById('editReturnGroup').hidden = !isReturned;
}

async function submitEditOrder() {
  const orderId = document.getElementById('editOrderId').value;
  const data = {
    status: document.getElementById('editOrderStatus').value,
    shippingFee: parseFloat(document.getElementById('editOrderShipping').value) || 0,
    paymentMethod: document.getElementById('editOrderPayment').value,
    deposit: parseFloat(document.getElementById('editOrderDeposit').value) || 0,
    paymentProofBase64: await getBase64Image('editOrderProof') || '',
    paymentProofFileName: document.getElementById('editOrderProof').files[0]?.name || '',
    returnReason: document.getElementById('editOrderReturnReason').value,
  };

  try {
    await adminApi.orders.updateStatus(orderId, data);
    showToast(t('common.saved'), 'success');
    closeModal('editOrderModal');
    loadOrders();
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Fund
async function loadFund() {
  try {
    const transactionsRes = await adminApi.fund.list();

    allFundTransactions = transactionsRes.data.transactions || [];
    const summary = transactionsRes.data.summary;

    renderTeamCards(summary);
    renderFundTable(allFundTransactions);
  } catch (error) {
    console.error('Failed to load fund:', error);
    showAlert('globalAlert', error.message, 'error');
  }
}

function renderTeamCards(summary) {
  const container = document.getElementById('teamFundCards');
  const members = Object.keys(summary);

  container.innerHTML = members.map(m => {
    const data = summary[m] || { expenses: 0, fund: 0 };
    return `
      <div class="team-card">
        <h4>${escapeHtml(m)}</h4>
        <p><strong data-i18n="admin.expenses">مصروفات:</strong> <span class="expense">${formatCurrency(data.expenses)}</span></p>
        <p><strong data-i18n="admin.funding">تمويل:</strong> <span class="fund">${formatCurrency(data.fund)}</span></p>
      </div>
    `;
  }).join('');
}

function filterFund() {
  const nameFilter = document.getElementById('fundNameFilter').value;
  const typeFilter = document.getElementById('fundTypeFilter').value;

  let filtered = allFundTransactions;

  if (nameFilter !== 'ALL') {
    filtered = filtered.filter(t => t.name === nameFilter);
  }
  if (typeFilter !== 'ALL') {
    filtered = filtered.filter(t => t.type === typeFilter);
  }

  renderFundTable(filtered);
}

function renderFundTable(transactions) {
  const tbody = document.getElementById('fundTableBody');
  tbody.innerHTML = transactions.map(t => `
    <tr>
      <td>${escapeHtml(t.id)}</td>
      <td>${new Date(t.date).toLocaleDateString('ar-EG')}</td>
      <td>${escapeHtml(t.name)}</td>
      <td><span class="badge badge-${t.type === 'مصروف خامات' ? 'error' : 'success'}">${escapeHtml(t.type)}</span></td>
      <td style="color:var(--admin-success);font-weight:800;">${formatCurrency(t.amount)}</td>
      <td>${escapeHtml(t.details)}</td>
      <td>${escapeHtml(t.paymentMethod)}</td>
      <td>${t.imageUrl ? `<a href="${getPrivateFileUrl(t.imageUrl)}" target="_blank" class="admin-btn admin-btn-secondary btn-sm"><i class="fa-solid fa-eye"></i></a>` : '-'}</td>
    </tr>
  `).join('');
}

function openFundModal() {
  document.getElementById('fundForm').reset();
  document.getElementById('fndImagePreview').classList.remove('visible');
  openModal('fundModal');
}

async function submitFund() {
  const data = {
    name: document.getElementById('fndName').value,
    type: document.getElementById('fndType').value,
    amount: parseFloat(document.getElementById('fndAmount').value),
    details: document.getElementById('fndDetails').value.trim(),
    paymentMethod: document.getElementById('fndMethod').value,
    base64Image: await getBase64Image('fndImage'),
    fileName: document.getElementById('fndImage').files[0]?.name || '',
  };

  if (!data.name || !data.type || !data.amount || !data.details || !data.paymentMethod) {
    return showToast(t('common.required'), 'error');
  }

  try {
    await adminApi.fund.create(data);
    showToast(t('common.added'), 'success');
    closeModal('fundModal');
    loadFund();
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openEditFundModal() {
  document.getElementById('editFundForm').reset();
  openModal('editFundModal');
}

async function submitEditFund() {
  const id = document.getElementById('editFndId').value.trim();
  if (!id) return showToast(t('common.required'), 'error');

  const data = {
    type: document.getElementById('editFndType').value,
    amount: parseFloat(document.getElementById('editFndAmount').value),
    details: document.getElementById('editFndDetails').value.trim(),
    paymentMethod: document.getElementById('editFndMethod').value,
  };

  try {
    await adminApi.fund.update(id, data);
    showToast(t('common.saved'), 'success');
    closeModal('editFundModal');
    loadFund();
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Analysis
async function loadAnalysis() {
  try {
    const response = await adminApi.analysis();
    const data = response.data;

    document.getElementById('statDelivered').textContent = data.deliveredCount;
    document.getElementById('statRejected').textContent = data.rejectedCount;
    document.getElementById('statReturned').textContent = data.returnedCount;

    const bestSellersList = document.getElementById('bestSellersList');
    bestSellersList.innerHTML = data.bestSellers.map(b => `
      <li class="admin-list-item flex-between">
        <span>${escapeHtml(b.product)}</span>
        <span class="badge badge-primary">${b.count} ${t('admin.times') || 'مرة'}</span>
      </li>
    `).join('');

    const bestCustomers = document.getElementById('bestCustomersDetails');
    let html = '';
    if (data.bestMale) html += `<p class="mb-sm"><strong style="color:var(--admin-success);" data-i18n="admin.bestMale">أفضل عميل:</strong> ${escapeHtml(data.bestMale.name)} (${formatCurrency(data.bestMale.totalSpent)})</p>`;
    if (data.bestFemale) html += `<p class="mb-sm"><strong style="color:var(--admin-warning);" data-i18n="admin.bestFemale">أفضل عميلة:</strong> ${escapeHtml(data.bestFemale.name)} (${formatCurrency(data.bestFemale.totalSpent)})</p>`;
    if (data.topOverall) html += `<p><strong style="color:var(--admin-info);" data-i18n="admin.topOverall">الأعلى إنفاقاً:</strong> ${escapeHtml(data.topOverall.name)} (${formatCurrency(data.topOverall.totalSpent)})</p>`;
    bestCustomers.innerHTML = html || `<p style="color:var(--admin-text-muted);">${t('admin.noData') || 'لا توجد بيانات'}</p>`;
  } catch (error) {
    console.error('Failed to load analysis:', error);
    showAlert('globalAlert', error.message, 'error');
  }
}

// Settings
async function loadSettings() {
  try {
    const response = await adminApi.settings.get();
    const settings = response.data;

    document.getElementById('settingBrandName').value = settings.brand_name || '';
    document.getElementById('settingWhatsapp').value = settings.whatsapp || '';
    document.getElementById('settingInstagram').value = settings.instagram || '';
    document.getElementById('settingFacebook').value = settings.facebook || '';
    document.getElementById('settingTiktok').value = settings.tiktok || '';
    document.getElementById('settingInstapayUsername').value = settings.instapay_username || '';
    document.getElementById('settingInstapayLink').value = settings.instapay_link || '';
    document.getElementById('settingCompanyEmail').value = settings.company_email || '';
    document.getElementById('settingTeamSize').value = settings.team_size || 5;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const settings = {};
  for (const [key, value] of formData.entries()) {
    settings[key] = value;
  }

  try {
    await adminApi.settings.update(settings);
    showToast(t('common.saved'), 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Reviews
async function loadReviews() {
  try {
    const response = await adminApi.reviews.list();
    const reviews = response.data;

    const container = document.getElementById('reviewsContainer');
    container.innerHTML = reviews.map(r => `
      <div class="review-card">
        <h4>${escapeHtml(r.customerName)}</h4>
        <div class="text-warning">${'★'.repeat(r.rating)}</div>
        ${r.contentType === 'image' && r.content ? `<img src="${sanitizeUrl(r.content)}" alt="${escapeHtml(r.customerName)}">` : `<p>${escapeHtml(r.content)}</p>`}
        <small style="color:var(--admin-text-muted);">بواسطة: ${escapeHtml(r.addedBy)}</small>
        <div class="flex gap-sm mt-md">
          <button class="admin-btn admin-btn-secondary btn-sm" data-admin-action="toggle-review" data-id="${escapeHtml(r.id)}" data-approved="${!r.approved}">
            <i class="fa-solid ${r.approved ? 'fa-eye-slash' : 'fa-eye'}"></i>
            ${r.approved ? t('admin.hide') : t('admin.approve')}
          </button>
          <button class="admin-btn admin-btn-danger btn-sm" data-admin-action="delete-review" data-id="${escapeHtml(r.id)}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load reviews:', error);
    showAlert('globalAlert', error.message, 'error');
  }
}

function openReviewModal() {
  document.getElementById('reviewForm').reset();
  document.getElementById('revImagePreview').classList.remove('visible');
  document.getElementById('revTextGroup').hidden = false;
  document.getElementById('revImageGroup').hidden = true;
  openModal('reviewModal');
}

function toggleReviewFields() {
  const type = document.getElementById('revType').value;
  document.getElementById('revTextGroup').hidden = type !== 'text';
  document.getElementById('revImageGroup').hidden = type !== 'image';
}

async function submitReview() {
  const type = document.getElementById('revType').value;
  const data = {
    customerName: document.getElementById('revCustomerName').value.trim(),
    rating: parseInt(document.getElementById('revRating').value),
    contentType: type,
    textContent: type === 'text' ? document.getElementById('revText').value.trim() : '',
    base64Image: type === 'image' ? await getBase64Image('revImage') : null,
    fileName: type === 'image' ? document.getElementById('revImage').files[0]?.name : '',
  };

  if (!data.customerName || !data.rating || (type === 'text' && !data.textContent) || (type === 'image' && !data.base64Image)) {
    return showToast(t('common.required'), 'error');
  }

  try {
    await adminApi.reviews.create(data);
    showToast(t('common.added'), 'success');
    closeModal('reviewModal');
    loadReviews();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function toggleReviewApproval(id, approve) {
  try {
    await adminApi.reviews.update(id, { approved: approve });
    showToast(approve ? t('admin.approved') : t('admin.hidden'), 'success');
    loadReviews();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteReview(id) {
  if (!confirm(t('common.confirmDelete'))) return;
  try {
    await adminApi.reviews.delete(id);
    showToast(t('common.deleted'), 'success');
    loadReviews();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Order Modal
function openOrderModal() {
  const form = document.getElementById('orderForm');
  form.reset();
  document.getElementById('ordGovernorate').innerHTML = '<option value="">-- اختر المحافظة --</option>';
  document.getElementById('ordProduct').innerHTML = '<option value="">-- اختر المنتج --</option>';
  loadGovernoratesForOrder();
  loadProductsForOrder();
  openModal('orderModal');
}

async function loadGovernoratesForOrder() {
  const select = document.getElementById('ordGovernorate');
  const govs = ['القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'المنوفية', 'البحيرة', 'كفر الشيخ', 'الغربية', 'الدقهلية', 'الشرقية', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'شمال سيناء', 'جنوب سيناء', 'البحر الأحمر', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'الوادي الجديد', 'مطروح'];
  select.innerHTML = '<option value="">-- اختر المحافظة --</option>' + govs.map(g => `<option value="${g}">${g}</option>`).join('');
}

async function loadProductsForOrder() {
  try {
    const response = await adminApi.products.list();
    const select = document.getElementById('ordProduct');
    select.innerHTML = '<option value="">-- اختر المنتج --</option>' +
      response.data.filter(p => p.active).map(p => `<option value="${escapeHtml(p.id)}" data-price="${p.sellingPrice}">${escapeHtml(p.name)} (${formatCurrency(p.sellingPrice)})</option>`).join('');
  } catch (error) {
    console.error('Failed to load products for order:', error);
  }
}

function updateOrderPrice() {
  const productSelect = document.getElementById('ordProduct');
  const quantity = parseInt(document.getElementById('ordQuantity').value) || 1;
  const option = productSelect.options[productSelect.selectedIndex];
  const price = parseFloat(option?.dataset.price) || 0;
  document.getElementById('ordPrice').value = price * quantity;
}

async function submitOrder() {
  const form = document.getElementById('orderForm');
  const formData = new FormData(form);

  const items = [{
    productId: document.getElementById('ordProduct').value,
    quantity: parseInt(document.getElementById('ordQuantity').value) || 1,
  }];

  if (!items[0].productId) return showToast(t('common.required'), 'error');

  const data = {
    customer: {
      name: formData.get('fullName') || document.getElementById('ordCustomerName').value,
      email: formData.get('email') || 'admin@figurax.com',
      gender: document.getElementById('ordGender').value,
      phone: document.getElementById('ordPhone').value,
      governorate: document.getElementById('ordGovernorate').value,
      address: document.getElementById('ordAddress').value,
      locationUrl: document.getElementById('ordLocationUrl').value,
    },
    paymentMethod: 'cash_on_delivery',
    notes: '',
    platform: document.getElementById('ordPlatform').value,
    items,
  };

  try {
    await adminApi.orders.create(data);
    showToast(t('common.added'), 'success');
    closeModal('orderModal');
    loadOrders();
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-admin-action]');
  if (!button) return;
  const id = button.dataset.id;
  switch (button.dataset.adminAction) {
    case 'edit-category': editCategory(id); break;
    case 'delete-category': deleteCategory(id); break;
    case 'edit-product': editProduct(id); break;
    case 'delete-product': deleteProduct(id); break;
    case 'edit-order': openEditOrder(id); break;
    case 'toggle-review': toggleReviewApproval(id, button.dataset.approved === 'true'); break;
    case 'delete-review': deleteReview(id); break;
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose functions globally for inline handlers
window.handleLogin = handleLogin;
window.logout = logout;
window.showSection = showSection;
window.openCategoryModal = openCategoryModal;
window.submitCategory = submitCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.openProductModal = openProductModal;
window.submitProduct = submitProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.loadOrders = loadOrders;
window.filterOrders = filterOrders;
window.openEditOrder = openEditOrder;
window.toggleEditOrderFields = toggleEditOrderFields;
window.submitEditOrder = submitEditOrder;
window.loadFund = loadFund;
window.filterFund = filterFund;
window.openFundModal = openFundModal;
window.submitFund = submitFund;
window.openEditFundModal = openEditFundModal;
window.submitEditFund = submitEditFund;
window.loadAnalysis = loadAnalysis;
window.loadSettings = loadSettings;
window.loadReviews = loadReviews;
window.openReviewModal = openReviewModal;
window.toggleReviewFields = toggleReviewFields;
window.submitReview = submitReview;
window.toggleReviewApproval = toggleReviewApproval;
window.deleteReview = deleteReview;
window.openOrderModal = openOrderModal;
window.updateOrderPrice = updateOrderPrice;
window.submitOrder = submitOrder;
window.closeModal = closeModal;
window.previewImage = previewImage;
window.addCustomizationField = addCustomizationField;
window.syncCustomizationSchema = syncCustomizationSchema;