import { env } from '../../config/env.js';
import { sanitizeHtml, sanitizeUrl } from '../../utils/sanitize.js';

const BRAND_COLOR = '#e63946';
const BG_COLOR = '#111118';
const CARD_BG = '#1e1e24';
const TEXT_COLOR = '#ffffff';
const MUTED_COLOR = '#a0a0a0';
const SUCCESS_COLOR = '#2ec4b6';
const WARNING_COLOR = '#ff9f1c';

function baseTemplate(title, content, language = 'ar') {
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const align = language === 'ar' ? 'right' : 'left';

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f6;font-family:Arial,sans-serif;direction:${dir};text-align:${align};">
  <div style="max-width:600px;margin:0 auto;padding:25px;">
    <div style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);border:1px solid #eaeaea;">
      <div style="background-color:${BG_COLOR};color:${TEXT_COLOR};padding:20px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:bold;">FIGURAX <span style="color:${BRAND_COLOR};">STORE</span></h1>
        <p style="margin:5px 0 0 0;font-size:13px;opacity:0.8;">${language === 'ar' ? 'إشعارات العمليات المباشرة' : 'Live Operation Notifications'}</p>
      </div>
      <div style="padding:25px;color:#222222;font-size:15px;line-height:1.6;">
        ${content}
      </div>
      <div style="background-color:#f8f9fa;padding:15px;text-align:center;border-top:1px solid #eaeaea;">
        <p style="margin:0;font-size:12px;color:${MUTED_COLOR};">${language === 'ar' ? 'متجر FIGURAX للمجسمات والتحف الفنية' : 'FIGURAX - 3D Printed Figures & Collectibles'}</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

export function renderOrderConfirmationEmail(order, language = 'ar') {
  const isArabic = language === 'ar';
  const currency = env.defaultCurrency;

  const escape = (str) => sanitizeHtml(String(str ?? ''));

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee;">${escape(item.name)}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${escape(item.quantity)}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:${isArabic ? 'right' : 'left'};">${escape(item.unitPrice)} ${currency}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:${isArabic ? 'right' : 'left'};">${escape(item.totalPrice)} ${currency}</td>
    </tr>
  `).join('');

  const content = `
    <div style="background-color:#f8f9fa;border-right:4px solid ${BRAND_COLOR};padding:12px 15px;margin-bottom:20px;border-radius:4px;">
      <strong style="color:${BRAND_COLOR};font-size:16px;">${isArabic ? 'تأكيد طلب جديد' : 'New Order Confirmation'}</strong>
    </div>
    <p><strong>${isArabic ? 'رقم الطلب:' : 'Order Number:'}</strong> ${escape(order.orderId)}</p>
    <p><strong>${isArabic ? 'التاريخ:' : 'Date:'}</strong> ${new Date(order.date).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</p>
    <p><strong>${isArabic ? 'العميل:' : 'Customer:'}</strong> ${escape(order.customer.name)} (${order.customer.gender === 'male' ? (isArabic ? 'ذكر' : 'Male') : (isArabic ? 'أنثى' : 'Female')})</p>
    <p><strong>${isArabic ? 'البريد الإلكتروني:' : 'Email:'}</strong> ${escape(order.customer.email)}</p>
    <p><strong>${isArabic ? 'الهاتف:' : 'Phone:'}</strong> ${escape(order.customer.phone)}</p>
    <p><strong>${isArabic ? 'المحافظة:' : 'Governorate:'}</strong> ${escape(order.customer.governorate)}</p>
    <p><strong>${isArabic ? 'العنوان:' : 'Address:'}</strong> ${escape(order.customer.address)}</p>
    ${sanitizeUrl(order.customer.locationUrl) ? `<p><strong>${isArabic ? 'رابط الموقع:' : 'Location:'}</strong> <a href="${sanitizeUrl(order.customer.locationUrl)}" target="_blank" rel="noopener noreferrer">${isArabic ? 'عرض على الخريطة' : 'View on Map'}</a></p>` : ''}
    <p><strong>${isArabic ? 'طريقة الدفع:' : 'Payment Method:'}</strong> ${order.paymentMethod === 'cash_on_delivery' ? (isArabic ? 'نقداً عند الاستلام' : 'Cash on Delivery') : 'InstaPay'}</p>

    <h3 style="color:${BG_COLOR};margin-top:25px;margin-bottom:15px;">${isArabic ? 'تفاصيل الطلب' : 'Order Details'}</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background-color:${BG_COLOR};color:${TEXT_COLOR};">
          <th style="padding:10px;text-align:${isArabic ? 'right' : 'left'};">${isArabic ? 'المنتج' : 'Product'}</th>
          <th style="padding:10px;text-align:center;">${isArabic ? 'الكمية' : 'Qty'}</th>
          <th style="padding:10px;text-align:${isArabic ? 'right' : 'left'};">${isArabic ? 'السعر' : 'Price'}</th>
          <th style="padding:10px;text-align:${isArabic ? 'right' : 'left'};">${isArabic ? 'الإجمالي' : 'Total'}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="margin-top:20px;padding:15px;background-color:#f8f9fa;border-radius:8px;">
      <p style="margin:5px 0;"><strong>${isArabic ? 'المجموع الفرعي:' : 'Subtotal:'}</strong> <span style="float:${isArabic ? 'left' : 'right'};">${escape(order.subtotal)} ${currency}</span></p>
      <p style="margin:5px 0;"><strong>${isArabic ? 'الشحن:' : 'Shipping:'}</strong> <span style="float:${isArabic ? 'left' : 'right'};">${escape(order.shipping)} ${currency}</span></p>
      <p style="margin:5px 0;font-size:16px;font-weight:bold;"><strong>${isArabic ? 'الإجمالي:' : 'Total:'}</strong> <span style="float:${isArabic ? 'left' : 'right'};color:${BRAND_COLOR};">${escape(order.total)} ${currency}</span></p>
    </div>

    <p style="margin-top:20px;padding:15px;background-color:#fff3cd;border:1px solid #ffc107;border-radius:8px;color:#856404;">
      <strong>${isArabic ? 'ملاحظة:' : 'Note:'}</strong> ${isArabic
        ? 'تم استلام طلبك بنجاح. سيتواصل معك فريق FIGURAX للمتابعة وتأكيد التفاصيل.'
        : 'Your order has been received successfully. The FIGURAX team will contact you for follow-up and confirmation.'}
    </p>

    ${order.paymentMethod === 'instapay' ? `
    <div style="margin-top:20px;padding:15px;background-color:#e7f5e7;border:1px solid #2ec4b6;border-radius:8px;">
      <h4 style="margin-top:0;color:${SUCCESS_COLOR};">${isArabic ? 'معلومات الدفع عبر إنستاباي:' : 'InstaPay Payment Info:'}</h4>
      <p style="margin:5px 0;"><strong>${isArabic ? 'اسم المستخدم:' : 'Username:'}</strong> ${escape(env.gmail.sender)}</p>
      ${sanitizeUrl(order.instapayLink) ? `<p style="margin:5px 0;"><strong>${isArabic ? 'رابط الدفع:' : 'Payment Link:'}</strong> <a href="${sanitizeUrl(order.instapayLink)}" target="_blank" rel="noopener noreferrer">${escape(order.instapayLink)}</a></p>` : ''}
    </div>
    ` : ''}
  `;

  return baseTemplate(
    isArabic ? 'تأكيد طلب FIGURAX' : 'FIGURAX Order Confirmation',
    content,
    language
  );
}


export function renderDeliveredReviewEmail(order, language = 'ar') {
  const isArabic = language === 'ar';
  const escape = (str) => sanitizeHtml(String(str ?? ''));
  const reviewUrl = sanitizeUrl(order.reviewUrl);
  const whatsappUrl = sanitizeUrl(order.whatsappUrl);
  const productNames = (order.items || []).map(item => item.name).filter(Boolean).join(isArabic ? '، ' : ', ');

  const content = `
    <div style="text-align:center;padding:10px 0 20px;">
      <div style="font-size:42px;">❤️</div>
      <h2 style="margin:8px 0;color:${BRAND_COLOR};">${isArabic ? `شكراً ليك يا ${escape(order.customerName)}!` : `Thank you, ${escape(order.customerName)}!`}</h2>
      <p style="font-size:16px;">${isArabic ? 'طلبك وصل إليك، ونتمنى إن FIGURAX يكون عجبك.' : 'Your order has been delivered, and we hope you love your FIGURAX piece.'}</p>
    </div>

    <div style="padding:16px;background:#f8f9fa;border-radius:10px;margin:15px 0;">
      <p style="margin:5px 0;"><strong>${isArabic ? 'رقم الطلب:' : 'Order Number:'}</strong> ${escape(order.orderId)}</p>
      ${productNames ? `<p style="margin:5px 0;"><strong>${isArabic ? 'المنتجات:' : 'Products:'}</strong> ${escape(productNames)}</p>` : ''}
    </div>

    ${reviewUrl ? `
      <div style="text-align:center;margin:25px 0;">
        <h3 style="margin-bottom:8px;">${isArabic ? 'رأيك يهمنا ⭐' : 'Your review means a lot to us ⭐'}</h3>
        <p>${isArabic ? 'اختار تقييمك واكتب لنا رأيك في تجربتك مع FIGURAX.' : 'Choose your rating and tell us about your FIGURAX experience.'}</p>
        <a href="${reviewUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:bold;">${isArabic ? 'اترك تقييمك' : 'Leave a Review'}</a>
      </div>` : ''}

    ${whatsappUrl ? `
      <div style="text-align:center;margin:20px 0;">
        <p style="margin-bottom:10px;">${isArabic ? 'ولو حابب تكلمنا مباشرة، يسعدنا تواصلك معانا على واتساب.' : 'If you would like to contact us directly, we would love to hear from you on WhatsApp.'}</p>
        <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:bold;">${isArabic ? 'تواصل معنا على واتساب' : 'Chat with us on WhatsApp'}</a>
      </div>` : ''}

    <p style="margin-top:25px;text-align:center;color:#666;">${isArabic ? 'شكراً لثقتك في FIGURAX ❤️' : 'Thank you for choosing FIGURAX ❤️'}</p>
  `;

  return baseTemplate(
    isArabic ? 'شكراً لطلبك من FIGURAX' : 'Thank you for your FIGURAX order',
    content,
    language
  );
}

export function renderFinancialTransactionEmail(transaction, language = 'ar') {
  const isArabic = language === 'ar';
  const currency = env.defaultCurrency;
  const isExpense = transaction.type === 'مصروف خامات' || transaction.type === 'RAW_MATERIAL_EXPENSE';
  const accentColor = isExpense ? '#e63946' : '#2ec4b6';

  const escape = (str) => sanitizeHtml(String(str ?? ''));

  const content = `
    <div style="background-color:#f8f9fa;border-right:4px solid ${accentColor};padding:12px 15px;margin-bottom:20px;border-radius:4px;">
      <strong style="color:${accentColor};font-size:16px;">${isArabic ? 'معاملة مالية جديدة' : 'New Financial Transaction'}</strong>
    </div>
    <p><strong>${isArabic ? 'النوع:' : 'Type:'}</strong> <span style="color:${accentColor};font-weight:bold;">${escape(transaction.type)}</span></p>
    <p><strong>${isArabic ? 'المسؤول:' : 'Responsible:'}</strong> ${escape(transaction.name)}</p>
    <p><strong>${isArabic ? 'المبلغ:' : 'Amount:'}</strong> <span style="color:${accentColor};font-weight:bold;font-size:18px;">${escape(transaction.amount)} ${currency}</span></p>
    <p><strong>${isArabic ? 'التفاصيل:' : 'Details:'}</strong> ${escape(transaction.details)}</p>
    <p><strong>${isArabic ? 'طريقة الدفع:' : 'Payment Method:'}</strong> ${escape(transaction.paymentMethod)}</p>
    <p><strong>${isArabic ? 'التاريخ:' : 'Date:'}</strong> ${new Date(transaction.date).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</p>
    <p><strong>${isArabic ? 'أضيف بواسطة:' : 'Added By:'}</strong> ${escape(transaction.addedBy)}</p>
    ${sanitizeUrl(transaction.imageUrl) ? `<p style="margin-top:15px;"><a href="${sanitizeUrl(transaction.imageUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:${accentColor};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;">${isArabic ? 'عرض المرفق 📎' : 'View Attachment 📎'}</a></p>` : ''}
  `;

  return baseTemplate(
    isArabic ? 'إشعار معاملة مالية FIGURAX' : 'FIGURAX Financial Transaction Notice',
    content,
    language
  );
}

export function renderActivityLogEmail(logs, language = 'ar') {
  const isArabic = language === 'ar';

  const escape = (str) => sanitizeHtml(String(str ?? ''));

  const rowsHtml = logs.map(log => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee;">${new Date(log.dateTime).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;">${escape(log.admin)}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;">${escape(log.action)}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;">${escape(log.details)}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;">${escape(log.emailStatus)}</td>
    </tr>
  `).join('');

  const content = `
    <div style="background-color:#f8f9fa;border-right:4px solid ${BRAND_COLOR};padding:12px 15px;margin-bottom:20px;border-radius:4px;">
      <strong style="color:${BRAND_COLOR};font-size:16px;">${isArabic ? 'تقرير النشاطات' : 'Activity Report'}</strong>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background-color:${BG_COLOR};color:${TEXT_COLOR};">
          <th style="padding:10px;">${isArabic ? 'التاريخ' : 'Date'}</th>
          <th style="padding:10px;">${isArabic ? 'المسؤول' : 'Admin'}</th>
          <th style="padding:10px;">${isArabic ? 'الإجراء' : 'Action'}</th>
          <th style="padding:10px;">${isArabic ? 'التفاصيل' : 'Details'}</th>
          <th style="padding:10px;">${isArabic ? 'حالة الإيميل' : 'Email Status'}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  return baseTemplate(
    isArabic ? 'تقرير نشاطات FIGURAX' : 'FIGURAX Activity Report',
    content,
    language
  );
}