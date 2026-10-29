import { query, queryOne } from '../db.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { sendEmail } from './email.js';

async function saveNotificationLog({
  appointmentId,
  channel,
  recipient,
  workflow,
  subject,
  messageBody,
  status,
  serviceResponse,
  errorDetails
}: {
  appointmentId: string;
  channel: 'whatsapp' | 'email';
  recipient: string;
  workflow: string;
  subject?: string;
  messageBody: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  serviceResponse?: any;
  errorDetails?: string;
}) {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await query(
    `INSERT INTO notifications (
      id, appointment_id, channel, recipient, workflow,
      subject, message_body, status, service_response, error_details,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      appointmentId,
      channel,
      recipient,
      workflow,
      subject || null,
      messageBody,
      status,
      serviceResponse ? JSON.stringify(serviceResponse) : null,
      errorDetails || null,
      now,
      now
    ]
  );
  return id;
}

// ================= WORKFLOW A: PAYMENT VERIFIED =================
export async function executePaymentVerifiedWorkflow(appointmentId: string) {
  const apt = await queryOne<any>(
    `SELECT a.*, p.razorpay_payment_id, p.razorpay_order_id, p.method
     FROM appointments a
     LEFT JOIN payments p ON a.id = p.appointment_id
     WHERE a.id = $1`,
    [appointmentId]
  );

  if (!apt) return { error: 'Appointment not found' };

  // Idempotency check: don't send duplicate notifications if already executed
  const existingNotif = await queryOne<any>(
    `SELECT id FROM notifications
     WHERE appointment_id = $1 AND workflow = 'payment_verified' AND status IN ('sent', 'skipped')`,
    [appointmentId]
  );

  if (existingNotif) {
    return { status: 'already_executed', message: 'Payment verified notifications were already sent or queued.' };
  }

  const appUrl = process.env.APP_URL || 'https://ais-pre-4owsk32pksewjrueiqdoqt-156906514453.asia-northeast1.run.app';
  const adminDashboardUrl = `${appUrl}`;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'shreyashns19@gmail.com';

  // 1. Customer WhatsApp Message (Gracefully skipped if unconfigured)
  const whatsappText = `Namaste ${apt.customer_name}! 👋

Your payment for the Bima Dost insurance consultation has been received successfully, Dost.

Your appointment request is now awaiting approval. We'll send you the Google Meet details once your appointment is approved.

Appointment ID: #${apt.docket_number}
Requested date: ${apt.preferred_date}
Requested time: ${apt.preferred_time}

Thank you for choosing Bima Dost! 🤝`;

  const waResult = await sendWhatsAppMessage(apt.customer_phone, whatsappText);
  const waStatus = waResult.success ? 'sent' : waResult.skipped ? 'skipped' : 'failed';
  await saveNotificationLog({
    appointmentId,
    channel: 'whatsapp',
    recipient: apt.customer_phone,
    workflow: 'payment_verified',
    messageBody: whatsappText,
    status: waStatus,
    serviceResponse: waResult.response,
    errorDetails: waResult.error
  });

  // 2. Administrator Notification Email (Workflow A requirement: notify admin that approval is required)
  const adminEmailSubject = `[ACTION REQUIRED] New Insurance Consultation Awaiting Approval - #${apt.docket_number}`;
  const totalAmountNum = typeof apt.total_amount === 'number' ? apt.total_amount : parseFloat(apt.total_amount || 499);
  const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f5fbf6; color: #171d1a; margin: 0; padding: 24px; }
    .card { background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #E2DCD3; overflow: hidden; }
    .header { background: #144439; color: #ffffff; padding: 20px 24px; }
    .header h2 { margin: 0; font-size: 20px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #82b1a2; }
    .content { padding: 24px; }
    .alert-box { background: #ffdbcb; border: 1px solid #ff8843; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; color: #692b00; font-weight: 600; font-size: 13px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eff5f0; font-size: 13px; }
    .detail-label { color: #717975; font-weight: 500; }
    .detail-val { font-weight: 600; color: #171d1a; }
    .concern-box { background: #eff5f0; border-radius: 8px; padding: 14px; margin-top: 14px; font-size: 13px; color: #171d1a; line-height: 1.5; }
    .btn { display: inline-block; background: #D96B27; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-top: 20px; text-align: center; }
    .footer { padding: 16px 24px; background: #eff5f0; font-size: 11px; color: #717975; border-top: 1px solid #E2DCD3; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>Bima Dost Administrative Notification</h2>
      <p>New Appointment Request • Payment Verified</p>
    </div>
    <div class="content">
      <div class="alert-box">
        ⚠️ ADMINISTRATOR APPROVAL REQUIRED: Payment of ₹${totalAmountNum.toFixed(2)} has been verified via Razorpay. This appointment is currently PENDING APPROVAL. Please review the customer grievance and assign an advocate.
      </div>

      <div class="detail-row">
        <span class="detail-label">Appointment Docket:</span>
        <span class="detail-val">#${apt.docket_number}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Customer Name:</span>
        <span class="detail-val">${apt.customer_name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Mobile Number:</span>
        <span class="detail-val">${apt.customer_phone}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Email Address:</span>
        <span class="detail-val">${apt.customer_email}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Requested Date:</span>
        <span class="detail-val">${apt.preferred_date}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Requested Time:</span>
        <span class="detail-val">${apt.preferred_time}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment Amount:</span>
        <span class="detail-val">₹${totalAmountNum.toFixed(2)} (Verified)</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Razorpay Payment ID:</span>
        <span class="detail-val" style="font-family: monospace;">${apt.razorpay_payment_id || 'pay_verified'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Insurance Provider:</span>
        <span class="detail-val">${apt.insurance_company || 'General Insurer'}</span>
      </div>

      <div class="concern-box">
        <strong>Customer's Insurance Concern:</strong><br>
        "${apt.insurance_concern}"
      </div>

      <div style="text-align: center;">
        <a href="${adminDashboardUrl}" class="btn">Open Admin Dashboard to Review & Approve</a>
      </div>
    </div>
    <div class="footer">
      Bima Dost Civic Grievance System • Governed under Insurance Ombudsman Rules 2017 & Consumer Protection Act 2019.
    </div>
  </div>
</body>
</html>
  `;

  const adminEmailResult = await sendEmail({
    to: adminEmail,
    subject: adminEmailSubject,
    html: adminEmailHtml
  });

  await saveNotificationLog({
    appointmentId,
    channel: 'email',
    recipient: adminEmail,
    workflow: 'payment_verified',
    subject: adminEmailSubject,
    messageBody: adminEmailHtml,
    status: adminEmailResult.success ? 'sent' : 'failed',
    serviceResponse: adminEmailResult.response,
    errorDetails: adminEmailResult.error
  });

  // 3. Customer Payment Receipt & Pending Approval Email
  const custReceiptSubject = `Payment Received — Consultation Pending Approval (Docket #${apt.docket_number})`;
  const custReceiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f5fbf6; color: #171d1a; margin: 0; padding: 24px; }
    .card { background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #E2DCD3; overflow: hidden; }
    .header { background: #144439; color: #ffffff; padding: 20px 24px; }
    .content { padding: 24px; }
    .receipt-box { background: #eff5f0; border: 1px solid #c0c8c4; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #E2DCD3; }
    .status-badge { display: inline-block; background: #ffdbcb; color: #692b00; font-weight: bold; padding: 4px 10px; border-radius: 4px; font-size: 12px; }
    .footer { padding: 16px 24px; background: #eff5f0; font-size: 11px; color: #717975; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0;">Payment Confirmation & Receipt</h2>
      <p style="margin: 4px 0 0; color: #82b1a2;">Bima Dost Insurance Advisory • Docket #${apt.docket_number}</p>
    </div>
    <div class="content">
      <p>Namaste <strong>${apt.customer_name}</strong>,</p>
      <p>Your payment of <strong>₹${totalAmountNum.toFixed(2)}</strong> for an insurance legal consultation has been received successfully.</p>

      <div style="margin: 16px 0;">
        <span class="status-badge">Status: Pending Administrator Approval</span>
      </div>

      <p style="font-size: 13px; color: #404945; line-height: 1.5;">
        Your appointment request is currently being reviewed by our grievance administration panel. Once your assigned advocate confirms the slot, you will receive an email containing your official <strong>Google Meet video consultation link</strong>.
      </p>

      <div class="receipt-box">
        <div class="detail-row">
          <span>Docket Reference:</span>
          <strong>#${apt.docket_number}</strong>
        </div>
        <div class="detail-row">
          <span>Requested Date & Time:</span>
          <strong>${apt.preferred_date} at ${apt.preferred_time}</strong>
        </div>
        <div class="detail-row">
          <span>Amount Paid (incl. 18% GST):</span>
          <strong>₹${totalAmountNum.toFixed(2)}</strong>
        </div>
        <div class="detail-row">
          <span>Razorpay Payment ID:</span>
          <span style="font-family: monospace;">${apt.razorpay_payment_id || 'pay_verified'}</span>
        </div>
        <div class="detail-row" style="border: none;">
          <span>Insurance Issue:</span>
          <span>${apt.insurance_company || 'Insurance Claim'}</span>
        </div>
      </div>

      <p style="font-size: 12px; color: #717975;">
        You can track the live progress of your docket anytime on our portal using reference <strong>#${apt.docket_number}</strong>.
      </p>
    </div>
    <div class="footer">
      Bima Dost Civic Grievance System • Toll-free Helpline: 1800-209-CLAIM
    </div>
  </div>
</body>
</html>
  `;

  const custEmailResult = await sendEmail({
    to: apt.customer_email,
    subject: custReceiptSubject,
    html: custReceiptHtml
  });

  await saveNotificationLog({
    appointmentId,
    channel: 'email',
    recipient: apt.customer_email,
    workflow: 'payment_verified',
    subject: custReceiptSubject,
    messageBody: custReceiptHtml,
    status: custEmailResult.success ? 'sent' : 'failed',
    serviceResponse: custEmailResult.response,
    errorDetails: custEmailResult.error
  });

  // Update appointment notification status
  const notifSummary = `wa:${waStatus}, email:${adminEmailResult.success ? 'sent' : 'failed'}`;
  await query(
    `UPDATE appointments SET notification_status = $1, updated_at = $2 WHERE id = $3`,
    [notifSummary, new Date().toISOString(), appointmentId]
  );

  return {
    whatsapp: waResult,
    adminEmail: adminEmailResult,
    customerEmail: custEmailResult
  };
}

// ================= WORKFLOW B: ADMINISTRATOR APPROVES =================
export async function executeAdministratorApprovedWorkflow(
  appointmentId: string,
  meetUrl: string
) {
  const apt = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
  if (!apt) return { error: 'Appointment not found' };

  // Idempotency check: don't duplicate approval messages
  const existingApprovalNotif = await queryOne<any>(
    `SELECT id FROM notifications
     WHERE appointment_id = $1 AND workflow = 'appointment_approved' AND status IN ('sent', 'skipped')`,
    [appointmentId]
  );

  if (existingApprovalNotif) {
    return { status: 'already_executed', message: 'Approval notifications were already sent.' };
  }

  // 1. WhatsApp Approval Message to Customer (Gracefully skipped if unconfigured)
  const customerWhatsAppText = `Great news, ${apt.customer_name}! 🎉

Your Bima Dost consultation is confirmed, Dost.

📅 Date: ${apt.preferred_date}
⏰ Time: ${apt.preferred_time}
📍 Google Meet: ${meetUrl}

Please join at the scheduled time. We look forward to helping you understand your insurance options.

— Team Bima Dost`;

  const waResult = await sendWhatsAppMessage(apt.customer_phone, customerWhatsAppText);
  const waStatus = waResult.success ? 'sent' : waResult.skipped ? 'skipped' : 'failed';
  await saveNotificationLog({
    appointmentId,
    channel: 'whatsapp',
    recipient: apt.customer_phone,
    workflow: 'appointment_approved',
    messageBody: customerWhatsAppText,
    status: waStatus,
    serviceResponse: waResult.response,
    errorDetails: waResult.error
  });

  // 2. Email Notification to Customer with Google Meet Link
  const customerEmailSubject = `Your Bima Dost Insurance Consultation is Confirmed - #${apt.docket_number}`;
  const customerEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f5fbf6; color: #171d1a; margin: 0; padding: 24px; }
    .card { background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #E2DCD3; overflow: hidden; }
    .header { background: #144439; color: #ffffff; padding: 20px 24px; }
    .content { padding: 24px; }
    .meet-box { background: #bceddd; border: 1px solid #204f43; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center; }
    .meet-btn { display: inline-block; background: #144439; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-top: 10px; }
    .footer { padding: 16px 24px; background: #eff5f0; font-size: 11px; color: #717975; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0;">Consultation Confirmed</h2>
      <p style="margin: 4px 0 0; color: #82b1a2;">Bima Dost Docket #${apt.docket_number}</p>
    </div>
    <div class="content">
      <p>Namaste <strong>${apt.customer_name}</strong>,</p>
      <p>Your Bima Dost insurance claim consultation has been approved and scheduled with our senior advocate panel.</p>

      <div class="meet-box">
        <strong style="color: #002019; font-size: 16px;">Scheduled Session: ${apt.preferred_date} at ${apt.preferred_time}</strong>
        <p style="margin: 6px 0 10px; color: #204f43; font-size: 13px;">Duration: 30 minutes via Google Meet</p>
        <a href="${meetUrl}" class="meet-btn">Join Google Meet Consultation</a>
        <p style="font-size: 11px; margin-top: 8px; color: #204f43;">Link: ${meetUrl}</p>
      </div>

      <p style="font-size: 13px; color: #404945;">
        <strong>Preparation Checklist:</strong> Please keep your policy bond, claim denial/deduction letter, and discharge summary handy so your advocate can review the applicable IRDAI rules and precedent grounds.
      </p>
    </div>
    <div class="footer">
      Bima Dost • Toll-free Helpline: 1800-209-CLAIM (9 AM - 8 PM IST)
    </div>
  </div>
</body>
</html>
  `;

  const custEmailResult = await sendEmail({
    to: apt.customer_email,
    subject: customerEmailSubject,
    html: customerEmailHtml
  });

  await saveNotificationLog({
    appointmentId,
    channel: 'email',
    recipient: apt.customer_email,
    workflow: 'appointment_approved',
    subject: customerEmailSubject,
    messageBody: customerEmailHtml,
    status: custEmailResult.success ? 'sent' : 'failed',
    serviceResponse: custEmailResult.response,
    errorDetails: custEmailResult.error
  });

  // 3. Administrator Confirmation Email
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'shreyashns19@gmail.com';
  const adminConfirmSubject = `[CONFIRMED] Consultation Approved for ${apt.customer_name} - #${apt.docket_number}`;
  const adminConfirmHtml = `
    <div style="font-family: sans-serif; padding: 20px; color: #171d1a;">
      <h3>Consultation Approved</h3>
      <p>Appointment <strong>#${apt.docket_number}</strong> for <strong>${apt.customer_name}</strong> has been confirmed.</p>
      <p><strong>Scheduled Time:</strong> ${apt.preferred_date} at ${apt.preferred_time}</p>
      <p><strong>Google Meet Link:</strong> <a href="${meetUrl}">${meetUrl}</a></p>
      <p><strong>Customer Notification:</strong> Email: ${custEmailResult.success ? 'Delivered' : 'Failed'}, WhatsApp: ${waStatus}</p>
    </div>
  `;

  const adminEmailResult = await sendEmail({
    to: adminEmail,
    subject: adminConfirmSubject,
    html: adminConfirmHtml
  });

  await saveNotificationLog({
    appointmentId,
    channel: 'email',
    recipient: adminEmail,
    workflow: 'admin_alert',
    subject: adminConfirmSubject,
    messageBody: adminConfirmHtml,
    status: adminEmailResult.success ? 'sent' : 'failed',
    serviceResponse: adminEmailResult.response,
    errorDetails: adminEmailResult.error
  });

  const updatedSummary = `wa:${waStatus}, email:${custEmailResult.success ? 'sent' : 'failed'}`;
  await query(
    `UPDATE appointments SET notification_status = $1, updated_at = $2 WHERE id = $3`,
    [updatedSummary, new Date().toISOString(), appointmentId]
  );

  return {
    customerWhatsApp: waResult,
    customerEmail: custEmailResult,
    adminEmail: adminEmailResult
  };
}

// ================= WORKFLOW C: ADMINISTRATOR REJECTS =================
export async function executeAdministratorRejectedWorkflow(
  appointmentId: string,
  rejectionReason: string,
  isRefundInitiated: boolean
) {
  const apt = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
  if (!apt) return { error: 'Appointment not found' };

  const refundClause = isRefundInitiated
    ? ' If your payment of ₹499.00 was collected, your full 100% refund has been initiated to your original payment method (typically credited within 2-4 banking business days).'
    : '';

  // 1. WhatsApp Rejection Message (Gracefully skipped if unconfigured)
  const waText = `Namaste ${apt.customer_name},

Regarding your consultation request (ID: #${apt.docket_number}): Unfortunately, our legal advisory panel cannot accept this appointment at this time.

Reason: ${rejectionReason}
${refundClause}

If you have any questions, our toll-free helpline is 1800-209-CLAIM.

— Team Bima Dost`;

  const waResult = await sendWhatsAppMessage(apt.customer_phone, waText);
  const waStatus = waResult.success ? 'sent' : waResult.skipped ? 'skipped' : 'failed';
  await saveNotificationLog({
    appointmentId,
    channel: 'whatsapp',
    recipient: apt.customer_phone,
    workflow: 'appointment_rejected',
    messageBody: waText,
    status: waStatus,
    serviceResponse: waResult.response,
    errorDetails: waResult.error
  });

  // 2. Email Rejection Message
  const emailSubject = `Update Regarding Your Bima Dost Consultation Request - #${apt.docket_number}`;
  const emailHtml = `
    <div style="font-family: sans-serif; padding: 20px; color: #171d1a;">
      <h2>Bima Dost Appointment Update</h2>
      <p>Namaste <strong>${apt.customer_name}</strong>,</p>
      <p>Thank you for submitting your consultation request for Docket <strong>#${apt.docket_number}</strong>.</p>
      <p>Following review by our grievance team, we are unable to approve this appointment due to the following reason:</p>
      <blockquote style="background: #eff5f0; border-left: 4px solid #ba1a1a; padding: 12px; margin: 16px 0;">
        ${rejectionReason}
      </blockquote>
      <p>${refundClause}</p>
      <p>If you require further clarification, please call our toll-free helpline at <strong>1800-209-CLAIM</strong>.</p>
      <p>— Team Bima Dost</p>
    </div>
  `;

  const emailResult = await sendEmail({
    to: apt.customer_email,
    subject: emailSubject,
    html: emailHtml
  });

  await saveNotificationLog({
    appointmentId,
    channel: 'email',
    recipient: apt.customer_email,
    workflow: 'appointment_rejected',
    subject: emailSubject,
    messageBody: emailHtml,
    status: emailResult.success ? 'sent' : 'failed',
    serviceResponse: emailResult.response,
    errorDetails: emailResult.error
  });

  const updatedSummary = `rejection_notified (wa:${waStatus}, email:${emailResult.success ? 'sent' : 'failed'})`;
  await query(
    `UPDATE appointments SET notification_status = $1, updated_at = $2 WHERE id = $3`,
    [updatedSummary, new Date().toISOString(), appointmentId]
  );

  return {
    whatsapp: waResult,
    email: emailResult
  };
}

// ================= NOTIFICATION RETRY HANDLER =================
export async function retryNotification(notificationId: string) {
  const notif = await queryOne<any>('SELECT * FROM notifications WHERE id = $1', [notificationId]);
  if (!notif) {
    throw new Error('Notification record not found');
  }

  const apt = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [notif.appointment_id]);
  if (!apt) {
    throw new Error('Associated appointment not found');
  }

  let success = false;
  let errorDetails: string | null = null;
  let serviceResponse: any = null;

  if (notif.channel === 'email') {
    const res = await sendEmail({
      to: notif.recipient,
      subject: notif.subject || `Bima Dost Consultation Update - #${apt.docket_number}`,
      html: notif.message_body.startsWith('<') ? notif.message_body : `<div style="font-family:sans-serif;padding:20px;">${notif.message_body.replace(/\n/g, '<br/>')}</div>`
    });
    success = res.success;
    errorDetails = res.error || null;
    serviceResponse = res.response || null;
  } else if (notif.channel === 'whatsapp') {
    const res = await sendWhatsAppMessage(notif.recipient, notif.message_body);
    success = res.success;
    errorDetails = res.error || null;
    serviceResponse = res.response || null;
    if (res.skipped) {
      const now = new Date().toISOString();
      await query(
        `UPDATE notifications
         SET status = 'skipped', error_details = $1, attempts = attempts + 1, updated_at = $2
         WHERE id = $3`,
        [errorDetails, now, notificationId]
      );
      return await queryOne('SELECT * FROM notifications WHERE id = $1', [notificationId]);
    }
  }

  const newStatus = success ? 'sent' : 'failed';
  const now = new Date().toISOString();

  await query(
    `UPDATE notifications
     SET status = $1,
         service_response = $2,
         error_details = $3,
         attempts = attempts + 1,
         updated_at = $4
     WHERE id = $5`,
    [
      newStatus,
      serviceResponse ? JSON.stringify(serviceResponse) : null,
      errorDetails,
      now,
      notificationId
    ]
  );

  return await queryOne('SELECT * FROM notifications WHERE id = $1', [notificationId]);
}
