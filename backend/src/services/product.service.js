import {
  getAllRows,
  findRowById,
  findRows,
  appendRow,
  updateRow,
  invalidateCache,
  getNextId,
  SHEET_NAMES,
} from './sheets.service.js';


// =====================================================
// CATEGORIES
// =====================================================

export async function getCategories() {
  const [rows, productRows] = await Promise.all([
    getAllRows(SHEET_NAMES.CATEGORIES),
    getAllRows(SHEET_NAMES.PRODUCTS),
  ]);

  const productCounts = new Map();

  for (const entry of productRows) {
    const row = entry?.row || {};
    if (!row.ID) continue;

    const active =
      String(row.Active ?? 'true').toLowerCase() !== 'false';

    if (!active) continue;

    const category = String(row['التصنيف'] || '').trim();
    if (!category) continue;

    const key = category.toLowerCase();
    productCounts.set(key, (productCounts.get(key) || 0) + 1);
  }

  return rows
    .map((r) => r.row)
    .filter((r) => r.ID)
    .map((r) => {
      const name = String(r['اسم التصنيف'] || '').trim();

      return {
        id: r.ID,
        name,
        description: r['الوصف'] || '',
        productCount:
          (productCounts.get(name.toLowerCase()) ??
          parseInt(r['عدد المنتجات'], 10) ??
          0),
        active:
          String(
            r.Active ?? 'true'
          ).toLowerCase() !== 'false',
        createdAt: r.CreatedAt || '',
        updatedAt: r.UpdatedAt || '',
      };
    });
}


export async function getCategoryByName(
  categoryName
) {
  const name =
    String(
      categoryName || ''
    ).trim();

  if (!name) {
    return null;
  }

  const rows =
    await findRows(
      SHEET_NAMES.CATEGORIES,
      {
        'اسم التصنيف': name,
      }
    );

  if (!rows.length) {
    return null;
  }

  const row =
    rows[0].row;

  return {
    id: row.ID,

    name:
      row['اسم التصنيف'] || '',

    description:
      row['الوصف'] || '',

    productCount:
      parseInt(
        row['عدد المنتجات'],
        10
      ) || 0,

    active:
      String(
        row.Active ?? 'true'
      ).toLowerCase() !== 'false',

    createdAt:
      row.CreatedAt || '',

    updatedAt:
      row.UpdatedAt || '',
  };
}


export async function createCategory(
  categoryData
) {
  const name =
    String(
      categoryData?.name || ''
    ).trim();

  const description =
    String(
      categoryData?.description || ''
    ).trim();

  if (!name) {
    throw new Error(
      'Category name is required'
    );
  }

  const existing =
    await findRows(
      SHEET_NAMES.CATEGORIES,
      {
        'اسم التصنيف': name,
      }
    );

  if (existing.length > 0) {
    throw new Error(
      'Category with this name already exists'
    );
  }

  const id =
    await getNextId('CAT');

  const now =
    new Date().toISOString();

  await appendRow(
    SHEET_NAMES.CATEGORIES,
    [
      id,
      name,
      description,
      0,
      true,
      now,
      now,
    ]
  );

  invalidateCache(
    SHEET_NAMES.CATEGORIES
  );

  console.log(
    '✅ Category created:',
    {
      id,
      name,
    }
  );

  return {
    success: true,
    id,
  };
}


export async function updateCategory(
  categoryId,
  updates
) {
  const category =
    await findRowById(
      SHEET_NAMES.CATEGORIES,
      'ID',
      categoryId
    );

  if (!category) {
    throw new Error(
      'Category not found'
    );
  }

  const headers =
    category.headers;

  const newRow =
    headers.map(
      (header) =>
        category.row[header] ?? ''
    );

  // -----------------------------------------------
  // Update Name
  // -----------------------------------------------

  if (
    updates?.name !== undefined
  ) {
    const newName =
      String(
        updates.name || ''
      ).trim();

    if (!newName) {
      throw new Error(
        'Category name is required'
      );
    }

    const existing =
      await findRows(
        SHEET_NAMES.CATEGORIES,
        {
          'اسم التصنيف': newName,
        }
      );

    const duplicate =
      existing.some(
        (item) =>
          String(
            item.row.ID
          ).trim() !==
          String(categoryId).trim()
      );

    if (duplicate) {
      throw new Error(
        'Category with this name already exists'
      );
    }

    const index =
      headers.indexOf(
        'اسم التصنيف'
      );

    if (index !== -1) {
      newRow[index] =
        newName;
    }
  }

  // -----------------------------------------------
  // Update Description
  // -----------------------------------------------

  if (
    updates?.description !== undefined
  ) {
    const index =
      headers.indexOf(
        'الوصف'
      );

    if (index !== -1) {
      newRow[index] =
        String(
          updates.description || ''
        ).trim();
    }
  }

  // -----------------------------------------------
  // Update Active
  // -----------------------------------------------

  if (
    updates?.active !== undefined
  ) {
    const index =
      headers.indexOf(
        'Active'
      );

    if (index !== -1) {
      newRow[index] =
        Boolean(updates.active);
    }
  }

  // -----------------------------------------------
  // UpdatedAt
  // -----------------------------------------------

  const updatedAtIndex =
    headers.indexOf(
      'UpdatedAt'
    );

  if (updatedAtIndex !== -1) {
    newRow[updatedAtIndex] =
      new Date().toISOString();
  }

  await updateRow(
    SHEET_NAMES.CATEGORIES,
    category.rowIndex,
    newRow
  );

  invalidateCache(
    SHEET_NAMES.CATEGORIES
  );

  console.log(
    '✅ Category updated:',
    categoryId
  );

  return {
    success: true,
  };
}


// =====================================================
// PRODUCTS
// =====================================================

export async function getProducts(
  filters = {}
) {
  const rows =
    await getAllRows(
      SHEET_NAMES.PRODUCTS
    );

  let products =
    rows
      .map((r) => r.row)
      .filter((r) => r.ID)
      .map((r) => ({
        id:
          r.ID,

        categoryName:
          r['التصنيف'] || '',

        name:
          r['اسم المنتج'] || '',

        dimensions:
          r['لأبعاد (X*Y*Z سم)'] || '',

        weight:
          parseFloat(
            r['الوزن (جرام)']
          ) || 0,

        infillPercent:
          parseFloat(
            r['Infill %']
          ) || 0,

        manufacturingCost:
          parseFloat(
            r['تكلفة التصنيع عند التاجر']
          ) || 0,

        sellingPrice:
          parseFloat(
            r['سعر البيع']
          ) || 0,

        material:
          r['مادة التصنيع'] || '',

        imageUrl:
          r['صورة المنتج'] || '',

        originalPrice:
          parseFloat(
            r['السعر قبل الخصم'] ||
            r['OriginalPrice'] ||
            0
          ) || 0,

        featured:
          String(
            r['مميز'] ?? r.Featured ?? 'false'
          ).toLowerCase() === 'true',

        customizable:
          String(
            r['قابل للتخصيص'] ?? r.Customizable ?? 'false'
          ).toLowerCase() === 'true',

        productType:
          r['نوع المنتج'] ||
          r.ProductType ||
          '',

        slug:
          r['Slug'] || '',

        customizationSchema:
          r['حقول التخصيص'] ||
          r.CustomizationSchema ||
          '',

        active:
          String(r.Active ?? 'true').toLowerCase() !== 'false',

        description:
          r.Description ||
          r['وصف المنتج'] ||
          '',
      }));

  // -----------------------------------------------
  // Category Filter
  // -----------------------------------------------

  if (filters.category) {
    const category =
      String(
        filters.category
      )
        .trim()
        .toLowerCase();

    products =
      products.filter(
        (product) =>
          String(
            product.categoryName
          )
            .trim()
            .toLowerCase() ===
          category
      );
  }

  // -----------------------------------------------
  // Search
  // -----------------------------------------------

  if (filters.search) {
    const search =
      String(
        filters.search
      )
        .trim()
        .toLowerCase();

    products =
      products.filter(
        (product) =>
          String(
            product.name || ''
          )
            .toLowerCase()
            .includes(search) ||

          String(
            product.categoryName || ''
          )
            .toLowerCase()
            .includes(search)
      );
  }

  return products;
}


export async function getProductById(
  productId
) {
  const product =
    await findRowById(
      SHEET_NAMES.PRODUCTS,
      'ID',
      productId
    );

  if (!product) {
    return null;
  }

  const row =
    product.row;

  return {
    id:
      row.ID,

    categoryName:
      row['التصنيف'] || '',

    name:
      row['اسم المنتج'] || '',

    dimensions:
      row['لأبعاد (X*Y*Z سم)'] || '',

    weight:
      parseFloat(
        row['الوزن (جرام)']
      ) || 0,

    infillPercent:
      parseFloat(
        row['Infill %']
      ) || 0,

    manufacturingCost:
      parseFloat(
        row['تكلفة التصنيع عند التاجر']
      ) || 0,

    sellingPrice:
      parseFloat(
        row['سعر البيع']
      ) || 0,

    material:
      row['مادة التصنيع'] || '',

    imageUrl:
      row['صورة المنتج'] || '',

    originalPrice:
      parseFloat(
        row['السعر قبل الخصم'] ||
        row['OriginalPrice'] ||
        0
      ) || 0,

    featured:
      String(
        row['مميز'] ?? row.Featured ?? 'false'
      ).toLowerCase() === 'true',

    customizable:
      String(
        row['قابل للتخصيص'] ?? row.Customizable ?? 'false'
      ).toLowerCase() === 'true',

    productType:
      row['نوع المنتج'] ||
      row.ProductType ||
      '',

    slug:
      row['Slug'] || '',

    customizationSchema:
      row['حقول التخصيص'] ||
      row.CustomizationSchema ||
      '',

    active:
      String(
        row.Active ?? 'true'
      ).toLowerCase() !== 'false',

    description:
      row.Description ||
      row['وصف المنتج'] ||
      '',
  };
}


export async function createProduct(
  productData,
  adminUser
) {
  const productName =
    String(
      productData.name || ''
    ).trim();

  if (!productName) {
    throw new Error(
      'Product name is required'
    );
  }

  // -----------------------------------------------
  // Check duplicate product
  // -----------------------------------------------

  const existing =
    await findRows(
      SHEET_NAMES.PRODUCTS,
      {
        'اسم المنتج':
          productName,
      }
    );

  if (existing.length > 0) {
    throw new Error(
      'Product with this name already exists'
    );
  }

  // -----------------------------------------------
  // Category
  // -----------------------------------------------

  const categoryName =
    String(
      productData.categoryName ||
      productData.category ||
      ''
    ).trim();

  if (!categoryName) {
    throw new Error(
      'Category is required'
    );
  }

  const categoryRows =
    await findRows(
      SHEET_NAMES.CATEGORIES,
      {
        'اسم التصنيف':
          categoryName,
      }
    );

  if (
    categoryRows.length === 0
  ) {
    throw new Error(
      'Category not found'
    );
  }

  const category =
    categoryRows[0].row;

  if (
    String(
      category.Active ?? 'true'
    ).toLowerCase() === 'false'
  ) {
    throw new Error(
      'Category is inactive'
    );
  }

  // -----------------------------------------------
  // Image URL
  // -----------------------------------------------

  const imageUrl =
    String(
      productData.imageUrl || ''
    ).trim();

  // -----------------------------------------------
  // Create ID
  // -----------------------------------------------

  const id =
    await getNextId('PRD');

  // -----------------------------------------------
  // Save Product
  // -----------------------------------------------

  await appendRow(
    SHEET_NAMES.PRODUCTS,
    [
      id,
      categoryName,
      productName,
      productData.dimensions || '',
      productData.weight || 0,
      productData.infillPercent || 0,
      productData.manufacturingCost || 0,
      productData.sellingPrice || 0,
      String(
        productData.material || ''
      ).trim(),
      imageUrl,
      productData.originalPrice || '',
      String(productData.featured ?? false),
      String(productData.customizable ?? false),
      String(productData.productType || ''),
      String(productData.slug || '').trim(),
      String(productData.customizationSchema || ''),
      String(productData.active ?? true),
      String(productData.description || '').trim(),
    ]
  );

  invalidateCache(
    SHEET_NAMES.PRODUCTS
  );

  console.log(
    '✅ Product created:',
    {
      id,
      name: productName,
      imageUrl,
    }
  );

  return {
    success: true,
    id,
  };
}


export async function updateProduct(
  productId,
  updates,
  adminUser
) {
  const product =
    await findRowById(
      SHEET_NAMES.PRODUCTS,
      'ID',
      productId
    );

  if (!product) {
    throw new Error(
      'Product not found'
    );
  }

  const headers =
    product.headers;

  const newRow =
    headers.map(
      (header) =>
        product.row[header] ?? ''
    );

  // -----------------------------------------------
  // Category
  // -----------------------------------------------

  if (
    updates.categoryName !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'التصنيف'
      );

    if (index !== -1) {
      newRow[index] =
        String(
          updates.categoryName ||
          ''
        ).trim();
    }
  }

  // -----------------------------------------------
  // Name
  // -----------------------------------------------

  if (
    updates.name !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'اسم المنتج'
      );

    if (index !== -1) {
      newRow[index] =
        String(
          updates.name || ''
        ).trim();
    }
  }

  // -----------------------------------------------
  // Dimensions
  // -----------------------------------------------

  if (
    updates.dimensions !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'لأبعاد (X*Y*Z سم)'
      );

    if (index !== -1) {
      newRow[index] =
        String(
          updates.dimensions || ''
        ).trim();
    }
  }

  // -----------------------------------------------
  // Weight
  // -----------------------------------------------

  if (
    updates.weight !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'الوزن (جرام)'
      );

    if (index !== -1) {
      newRow[index] =
        updates.weight || 0;
    }
  }

  // -----------------------------------------------
  // Infill
  // -----------------------------------------------

  if (
    updates.infillPercent !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'Infill %'
      );

    if (index !== -1) {
      newRow[index] =
        updates.infillPercent || 0;
    }
  }

  // -----------------------------------------------
  // Manufacturing Cost
  // -----------------------------------------------

  if (
    updates.manufacturingCost !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'تكلفة التصنيع عند التاجر'
      );

    if (index !== -1) {
      newRow[index] =
        updates.manufacturingCost || 0;
    }
  }

  // -----------------------------------------------
  // Selling Price
  // -----------------------------------------------

  if (
    updates.sellingPrice !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'سعر البيع'
      );

    if (index !== -1) {
      newRow[index] =
        updates.sellingPrice || 0;
    }
  }

  // -----------------------------------------------
  // Material
  // -----------------------------------------------

  if (
    updates.material !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'مادة التصنيع'
      );

    if (index !== -1) {
      newRow[index] =
        String(
          updates.material || ''
        ).trim();
    }
  }

  // -----------------------------------------------
  // Image URL
  // -----------------------------------------------

  if (
    updates.imageUrl !==
    undefined
  ) {
    const index =
      headers.indexOf(
        'صورة المنتج'
      );

    if (index !== -1) {
      newRow[index] =
        String(
          updates.imageUrl || ''
        ).trim();
    }

    console.log(
      '🖼️ Updating product image:',
      updates.imageUrl
    );
  }

  if (updates.originalPrice !== undefined) {
    const index = headers.indexOf('السعر قبل الخصم');
    if (index !== -1) newRow[index] = updates.originalPrice || '';
  }

  if (updates.featured !== undefined) {
    const index = headers.indexOf('مميز');
    if (index !== -1) newRow[index] = String(Boolean(updates.featured));
  }

  if (updates.customizable !== undefined) {
    const index = headers.indexOf('قابل للتخصيص');
    if (index !== -1) newRow[index] = String(Boolean(updates.customizable));
  }

  if (updates.productType !== undefined) {
    const index = headers.indexOf('نوع المنتج');
    if (index !== -1) newRow[index] = String(updates.productType || '').trim();
  }

  if (updates.slug !== undefined) {
    const index = headers.indexOf('Slug');
    if (index !== -1) newRow[index] = String(updates.slug || '').trim();
  }

  if (updates.customizationSchema !== undefined) {
    const index = headers.indexOf('حقول التخصيص');
    if (index !== -1) newRow[index] = String(updates.customizationSchema || '').trim();
  }

  if (updates.active !== undefined) {
    const index = headers.indexOf('Active');
    if (index !== -1) newRow[index] = String(Boolean(updates.active));
  }

  if (updates.description !== undefined) {
    const index = headers.indexOf('Description');
    if (index !== -1) {
      newRow[index] = String(updates.description || '').trim();
    }
  }

  await updateRow(
    SHEET_NAMES.PRODUCTS,
    product.rowIndex,
    newRow
  );

  invalidateCache(
    SHEET_NAMES.PRODUCTS
  );

  console.log(
    '✅ Product updated:',
    productId
  );

  return {
    success: true,
  };
}


export async function deleteProduct(
  productId
) {
  const product =
    await findRowById(
      SHEET_NAMES.PRODUCTS,
      'ID',
      productId
    );

  if (!product) {
    throw new Error(
      'Product not found'
    );
  }

  const headers = product.headers;
  const newRow = [
    ...Object.values(product.row),
  ];

  const activeIndex = headers.indexOf('Active');
  if (activeIndex !== -1) {
    newRow[activeIndex] = 'false';
  }

  const updatedAtIndex = headers.indexOf('UpdatedAt');
  if (updatedAtIndex !== -1) {
    newRow[updatedAtIndex] = new Date().toISOString();
  }

  await updateRow(
    SHEET_NAMES.PRODUCTS,
    product.rowIndex,
    newRow
  );

  invalidateCache(
    SHEET_NAMES.PRODUCTS
  );

  console.log(
    '✅ Product deleted:',
    productId
  );

  return {
    success: true,
  };
}