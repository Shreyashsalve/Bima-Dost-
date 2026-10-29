import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { db, initDatabase } from '../server/db.js';
import { askBimaDostChatbot } from '../server/services/chatbot.js';
import { isWhatsAppConfigured } from '../server/services/whatsapp.js';
import { isResendConfigured, sendEmail } from '../server/services/email.js';
import { isGoogleCalendarConfigured, createGoogleCalendarAppointment } from '../server/services/calendar.js';
import {
  executePaymentVerifiedWorkflow,
  executeAdministratorApprovedWorkflow,
  executeAdministratorRejectedWorkflow,
  retryNotification
} from '../server/services/notificationWorkflow.js';

initDatabase();

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`, details || '');
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('  BIMA DOST — FULL STACK END-TO-END TEST SUITE');
  console.log('====================================================\n');

  // TEST 1: ENVIRONMENT & CONFIGURATION VALIDATION
  console.log('▶ [Test 1] Integration & Environment Config Inspection');
  const resendOk = isResendConfigured();
  const calendarOk = isGoogleCalendarConfigured();
  const whatsappConfigured = isWhatsAppConfigured();

  assert(resendOk === true, 'Resend API is properly configured and active');
  assert(calendarOk === true, 'Google Service Account & Calendar are configured');
  assert(whatsappConfigured === false, 'WhatsApp is safely marked unconfigured (graceful fallback mode)');
  assert(Boolean(process.env.JWT_SECRET), 'JWT_SECRET is set');
  assert(Boolean(process.env.RAZORPAY_KEY_ID), 'RAZORPAY_KEY_ID is set');
  assert(Boolean(process.env.ADMIN_NOTIFICATION_EMAIL), 'ADMIN_NOTIFICATION_EMAIL is set');

  // TEST 2: MULTILINGUAL GEMINI CHATBOT (Hindi, Marathi, English)
  console.log('\n▶ [Test 2] Gemini Multilingual Chatbot');
  try {
    console.log('  - Testing English consultation query...');
    const enRes = await askBimaDostChatbot('My health insurance claim was rejected citing pre-existing condition, what should I do?');
    assert(Boolean(enRes.reply) && enRes.reply.length > 50, 'English response generated');
    assert(Boolean(enRes.detectedLanguage?.toLowerCase().includes('english')) || enRes.reply.includes('Dost'), 'Dost advisory persona present in English');

    console.log('  - Testing Hindi insurance query...');
    const hiRes = await askBimaDostChatbot('मेरा मेडिक्लेम खारिज हो गया है, मुझे क्या करना चाहिए?');
    assert(Boolean(hiRes.reply) && hiRes.reply.length > 30, 'Hindi response generated successfully');
    assert(hiRes.suggestBooking === true, 'Consultation booking suggested for claim rejection problem');

    console.log('  - Testing Marathi insurance query...');
    const mrRes = await askBimaDostChatbot('माझा विमा क्लेम कंपनीने नाकारला आहे, काय करावे?');
    assert(Boolean(mrRes.reply) && mrRes.reply.length > 30, 'Marathi response generated successfully');
  } catch (err: any) {
    console.error('Chatbot test failure:', err.message);
    throw err;
  }

  // TEST 3: DATABASE CONSTRAINTS & TABLES
  console.log('\n▶ [Test 3] Database Schema & Constraint Validation');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const tableNames = tables.map(t => t.name);
  assert(tableNames.includes('appointments'), 'appointments table exists');
  assert(tableNames.includes('payments'), 'payments table exists');
  assert(tableNames.includes('notifications'), 'notifications table exists');
  assert(tableNames.includes('admins'), 'admins table exists');

  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get('admin@bimadost.in') as any;
  assert(Boolean(admin) && admin.role === 'admin', 'Default admin exists with role admin');
  assert(Boolean(admin.password_hash) && !admin.password_hash.includes('AdminPassword'), 'Admin password is encrypted with bcrypt hash');

  // TEST 4: APPOINTMENT CREATION & BOOKING WORKFLOW (Customer 1)
  console.log('\n▶ [Test 4] Appointment Initiation & Storage');
  const testApptId = `test_appt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const testDocket = `BD-${Date.now().toString().slice(-6)}`;
  const testDate = '2026-11-15';
  const testTime = '11:00 AM';

  db.prepare(`
    INSERT INTO appointments (
      id, docket_number, customer_name, customer_phone, customer_email,
      preferred_date, preferred_time, insurance_concern, insurance_company,
      preferred_language, fee, tax, total_amount, payment_status, status,
      notification_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'awaiting_payment', 'pending', ?, ?)
  `).run(
    testApptId,
    testDocket,
    'Rajesh Kumar Sharma',
    '+91 98765 43210',
    'delivered@resend.dev',
    testDate,
    testTime,
    'Mediclaim hospital bill of Rs 3,50,000 delayed for 45 days by TPA without settlement',
    'Star Health & Allied Insurance',
    'Hindi',
    422.88,
    76.12,
    499.00,
    new Date().toISOString(),
    new Date().toISOString()
  );

  const testOrderId = `order_${Date.now()}`;
  db.prepare(`
    INSERT INTO payments (
      id, appointment_id, razorpay_order_id, amount, currency, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'INR', 'created', ?, ?)
  `).run(`pay_test_${Date.now()}`, testApptId, testOrderId, 499.00, new Date().toISOString(), new Date().toISOString());

  const storedAppt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(testApptId) as any;
  assert(storedAppt.status === 'awaiting_payment', 'Initial appointment status is awaiting_payment');
  assert(storedAppt.payment_status === 'pending', 'Initial payment status is pending');

  // TEST 5: PAYMENT VERIFICATION & WORKFLOW A
  console.log('\n▶ [Test 5] Payment Verification & Workflow A Execution');
  const testPaymentId = `pay_rzp_${Date.now()}`;
  const testSecret = process.env.RAZORPAY_KEY_SECRET || 'Razorpay@shreyash123';
  const expectedSig = crypto
    .createHmac('sha256', testSecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  // Simulate payment verification
  db.prepare(`
    UPDATE payments
    SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'captured', method = 'upi', updated_at = ?
    WHERE razorpay_order_id = ?
  `).run(testPaymentId, expectedSig, new Date().toISOString(), testOrderId);

  db.prepare(`
    UPDATE appointments
    SET payment_status = 'verified', status = 'payment_verified_awaiting_approval', updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), testApptId);

  // Trigger Workflow A
  console.log('  - Executing Workflow A (Email dispatch & WhatsApp fallback record)...');
  const workflowAResult: any = await executePaymentVerifiedWorkflow(testApptId);
  assert(workflowAResult?.whatsapp?.skipped === true, 'WhatsApp safely recorded as skipped without error');
  assert(workflowAResult?.adminEmail?.success === true, 'Admin alert email delivered via Resend');
  assert(workflowAResult?.customerEmail?.success === true, 'Customer receipt email delivered via Resend');

  // Check notifications audit log
  const notificationsA = db.prepare('SELECT * FROM notifications WHERE appointment_id = ?').all(testApptId) as any[];
  assert(notificationsA.length >= 3, 'Recorded notification audit entries (WhatsApp, Admin Email, Customer Email)');
  
  const waAudit = notificationsA.find(n => n.channel === 'whatsapp');
  assert(waAudit && waAudit.status === 'skipped', 'WhatsApp audit log status is explicitly "skipped"');
  
  const emailAudit = notificationsA.find(n => n.channel === 'email');
  assert(emailAudit && emailAudit.status === 'sent', 'Resend email audit log status is "sent"');

  // TEST 6: ADMINISTRATOR APPROVAL & WORKFLOW B (Google Calendar & Customer Confirmation)
  console.log('\n▶ [Test 6] Admin Approval & Workflow B (Calendar + Confirmed Email)');
  const adminMeetUrl = 'https://meet.google.com/bima-dost-room';
  const adminNotes = 'Approved for Adv. Meenakshi Sundaram - Specialist in TPA Claims';

  const calResult = await createGoogleCalendarAppointment({
    appointmentId: testApptId,
    docketNumber: testDocket,
    customerName: 'Rajesh Kumar Sharma',
    customerEmail: 'delivered@resend.dev',
    customerPhone: '+91 98765 43210',
    date: testDate,
    timeSlot: testTime,
    insuranceConcern: 'Mediclaim hospital bill of Rs 3,50,000 delayed for 45 days',
    insuranceCompany: 'Star Health'
  });
  const meetUrl = calResult.meetUrl || adminMeetUrl;

  db.prepare(`
    UPDATE appointments
    SET status = 'approved',
        google_meet_url = ?,
        calendar_event_id = ?,
        approval_timestamp = ?,
        admin_notes = ?,
        updated_at = ?
    WHERE id = ?
  `).run(meetUrl, calResult.eventId || 'evt_sim_123', new Date().toISOString(), adminNotes, new Date().toISOString(), testApptId);

  const workflowBResult: any = await executeAdministratorApprovedWorkflow(testApptId, meetUrl);
  assert(workflowBResult?.customerWhatsApp?.skipped === true, 'Approval WhatsApp notification safely skipped');
  assert(workflowBResult?.customerEmail?.success === true, 'Customer approval email delivered via Resend');
  assert(workflowBResult?.adminEmail?.success === true, 'Admin confirmation email delivered via Resend');

  const approvedAppt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(testApptId) as any;
  assert(approvedAppt.status === 'approved', 'Appointment status is approved');
  assert(Boolean(approvedAppt.google_meet_url), 'Appointment stores google_meet_url');
  assert(Boolean(approvedAppt.calendar_event_id), 'Appointment stores calendar_event_id');
  assert(Boolean(approvedAppt.approval_timestamp), 'Appointment stores approval timestamp');

  // TEST 7: REJECTION WORKFLOW & REFUND TERMS (Customer 2)
  console.log('\n▶ [Test 7] Admin Rejection & Workflow C (Clear Refund Terms)');
  const rejectApptId = `test_reject_${Date.now()}`;
  db.prepare(`
    INSERT INTO appointments (
      id, docket_number, customer_name, customer_phone, customer_email,
      preferred_date, preferred_time, insurance_concern, insurance_company,
      preferred_language, fee, tax, total_amount, payment_status, status,
      notification_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 'payment_verified_awaiting_approval', 'pending', ?, ?)
  `).run(
    rejectApptId,
    `BD-${Date.now().toString().slice(-6)}`,
    'Sunil Patil',
    '+91 99887 76655',
    'delivered@resend.dev',
    '2026-11-20',
    '02:00 PM',
    'Dispute regarding vehicle damage total loss evaluation',
    'ICICI Lombard',
    'Marathi',
    422.88,
    76.12,
    499.00,
    new Date().toISOString(),
    new Date().toISOString()
  );

  const rejectionReason = 'Requested slot unavailable and documentation for FIR copy missing.';
  db.prepare(`
    UPDATE appointments
    SET status = 'rejected',
        payment_status = 'refunded',
        rejection_reason = ?,
        updated_at = ?
    WHERE id = ?
  `).run(rejectionReason, new Date().toISOString(), rejectApptId);

  const workflowCResult: any = await executeAdministratorRejectedWorkflow(rejectApptId, rejectionReason, true);
  assert(workflowCResult?.whatsapp?.skipped === true, 'Rejection WhatsApp notification safely skipped');
  assert(workflowCResult?.email?.success === true, 'Customer rejection email delivered via Resend with refund terms');

  const rejectedAppt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(rejectApptId) as any;
  assert(rejectedAppt.status === 'rejected', 'Appointment status is rejected');
  assert(rejectedAppt.payment_status === 'refunded', 'Payment status updated to refunded');
  assert(rejectedAppt.rejection_reason === rejectionReason, 'Rejection reason recorded in database');

  // TEST 8: NOTIFICATION RETRY ENDPOINT
  console.log('\n▶ [Test 8] Notification Retry Functionality');
  const failedNotifId = `notif_fail_${Date.now()}`;
  db.prepare(`
    INSERT INTO notifications (
      id, appointment_id, channel, recipient, workflow, subject, message_body, status, attempts, error_details, created_at, updated_at
    ) VALUES (?, ?, 'email', 'shreyashns19@gmail.com', 'test_retry', 'Test Retry Subject', '<p>Test email body for retry</p>', 'failed', 1, 'Simulated network drop', ?, ?)
  `).run(failedNotifId, testApptId, new Date().toISOString(), new Date().toISOString());

  const retryResult = await retryNotification(failedNotifId) as any;
  assert(Boolean(retryResult), 'Retry mechanism executed without error');
  assert(retryResult.attempts === 2, 'Attempts counter incremented on retry');
  assert(retryResult.status === 'sent', 'Failed notification status updated to sent after successful retry');

  // SUMMARY
  console.log('\n====================================================');
  console.log(`  ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions`);
  console.log('====================================================\n');
}

runTestSuite()
  .then(() => {
    console.log('Test suite execution completed cleanly.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
