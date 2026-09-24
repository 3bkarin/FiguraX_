import {
  getGmailClient,
} from '../config/google.js';

import {
  env,
} from '../config/env.js';

import {
  renderOrderConfirmationEmail,
  renderDeliveredReviewEmail,
  renderFinancialTransactionEmail,
} from './email/templates.js';


const gmail =
  getGmailClient();


const SENDER =
  env.gmail.sender;


function encodeBase64Url(
  str
) {
  return Buffer
    .from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}


async function sendRawEmail(
  to,
  subject,
  htmlBody
) {
  if (!to) {
    return {
      success: false,
      error:
        'Recipient email is missing',
    };
  }


  if (!SENDER) {
    return {
      success: false,
      error:
        'Gmail sender is not configured',
    };
  }


  const message = [
    `From: ${SENDER}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    htmlBody,
  ].join('\r\n');


  const encodedMessage =
    encodeBase64Url(
      message
    );


  try {
    const response =
      await gmail.users.messages.send(
        {
          userId: 'me',

          requestBody: {
            raw:
              encodedMessage,
          },
        }
      );


    const messageId =
      response?.data?.id;


    if (!messageId) {
      return {
        success: false,
        error:
          'Gmail accepted the request but returned no message ID',
      };
    }


    console.log(
      `✅ Gmail message sent successfully to ${to}`
    );


    return {
      success: true,
      messageId,
    };


  } catch (error) {
    console.error(
      '❌ Gmail send error:',
      error?.message ||
        error
    );


    return {
      success: false,

      error:
        error?.response?.data?.error?.message ||
        error?.message ||
        'Unknown Gmail error',
    };
  }
}


export async function sendOrderConfirmationEmail(
  order,
  customerEmail,
  language = 'ar'
) {
  const subject =
    language === 'ar'
      ? `FIGURAX — تأكيد الطلب #${order.orderId}`
      : `FIGURAX — Order Confirmation #${order.orderId}`;


  const htmlBody =
    renderOrderConfirmationEmail(
      order,
      language
    );


  return sendRawEmail(
    customerEmail,
    subject,
    htmlBody
  );
}



export async function sendDeliveredReviewEmail(
  order,
  customerEmail,
  language = 'ar'
) {
  const subject =
    language === 'ar'
      ? `FIGURAX — شكراً لطلبك #${order.orderId}`
      : `FIGURAX — Thank you for your order #${order.orderId}`;

  const htmlBody = renderDeliveredReviewEmail(order, language);
  return sendRawEmail(customerEmail, subject, htmlBody);
}

export async function sendFinancialTransactionEmail(
  transaction,
  recipientEmail,
  language = 'ar'
) {
  const subject =
    language === 'ar'
      ? `FIGURAX — معاملة مالية: ${transaction.type} - ${transaction.amount} ${env.defaultCurrency}`
      : `FIGURAX — Financial Transaction: ${transaction.type} - ${transaction.amount} ${env.defaultCurrency}`;


  const htmlBody =
    renderFinancialTransactionEmail(
      transaction,
      language
    );


  return sendRawEmail(
    recipientEmail,
    subject,
    htmlBody
  );
}


export async function sendNotificationEmail(
  recipients,
  subject,
  htmlBody
) {
  const to =
    Array.isArray(
      recipients
    )
      ? recipients.join(', ')
      : recipients;


  return sendRawEmail(
    to,
    subject,
    htmlBody
  );
}


export async function testEmailConnection() {
  try {
    const profile =
      await gmail.users.getProfile(
        {
          userId: 'me',
        }
      );


    console.log(
      '✅ Gmail connected as:',
      profile.data.emailAddress
    );


    return true;


  } catch (error) {
    console.error(
      '❌ Gmail connection failed:',
      error?.response?.data?.error_description ||
        error?.response?.data?.error ||
        error?.message ||
        error
    );


    return false;
  }
}