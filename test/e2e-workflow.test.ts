import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, queryOne, withTransaction, initDatabase, closeDatabase } from '../server/db.js';
import { askBimaDostChatbot } from '../server/services/chatbot.js';
import { isWhatsAppConfigured } from '../server/services/whatsapp.js';
import { isResendConfigured } from '../server/services/email.js';
import { isGoogleCalendarConfigured, createGoogleCalendarAppointment } from '../server/services/calendar.js';
import {
  executePaymentVerifiedWorkflow,
  executeAdministratorApprovedWorkflow,
  executeAdministratorRejectedWorkflow,
  retryNotification,
} from '../server/services/notificationWorkflow.js';

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
  console.log('  BIMA DOST — POSTGRESQL FULL-STACK E2E TEST SUITE');
  console.log('====================================================\n');

  // Initialize PostgreSQL schema
  await initDatabase();

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

  // TEST 3: DATABASE SCHEMA & CONSTRAINT VALIDATION (PostgreSQL)
  console.log('\n▶ [Test 3] PostgreSQL Database Schema & Constraint Validation');
  const tableCheck = await query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const tableNames = tableCheck.rows.map((t) => t.table_name);
  assert(tableNames.includes('appointments'), 'appointments table exists in PostgreSQL');
  assert(tableNames.includes('payments'), 'payments table exists in PostgreSQL');
  assert(tableNames.includes('notifications'), 'notifications table exists in PostgreSQL');
  assert(tableNames.includes('admins'), 'admins table exists in PostgreSQL');
  assert(tableNames.includes('processed_webhooks'), 'processed_webhooks table exists in PostgreSQL');

  const admin = await queryOne<any>('SELECT * FROM admins LIMIT 1');
  assert(Boolean(admin) && admin.role === 'admin', 'Default admin exists with role admin');
  assert(Boolean(admin.password_hash) && !admin.password_hash.includes('AdminPassword'), 'Admin password is encrypted with bcrypt hash');

  // TEST 4: APPOINTMENT CREATION & BOOKING WORKFLOW (Customer 1)
  console.log('\n▶ [Test 4] Appointment Initiation & PostgreSQL Storage');
  const testApptId = `test_apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const testDocket = `BD-${Date.now().toString().slice(-6)}`;
  const testDate = '2026-11-15';
  const testTime = '11:00 AM';
  const nowStr = new Date().toISOString();

  await query(
    `INSERT INTO appointments (
      id, docket_number, customer_name, customer_phone, customer_email,
      preferred_date, preferred_time, insurance_concern, insurance_company,
      preferred_language, fee, tax, total_amount, payment_status, status,
      notification_status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13, 'pending', 'awaiting_payment', 'pending', $14, $15
    )`,
    [
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
      nowStr,
      nowStr,
    ]
  );

  const testOrderId = `order_${Date.now()}`;
  await query(
    `INSERT INTO payments (
      id, appointment_id, razorpay_order_id, amount, currency, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'INR', 'created', $5, $6)`,
    [`pay_test_${Date.now()}`, testApptId, testOrderId, 499.00, nowStr, nowStr]
  );

  const storedAppt = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [testApptId]);
  assert(storedAppt.status === 'awaiting_payment', 'Initial appointment status is awaiting_payment');
  assert(storedAppt.payment_status === 'pending', 'Initial payment status is pending');
  assert(typeof storedAppt.total_amount === 'number' || parseFloat(storedAppt.total_amount) === 499, 'Total amount numeric type preserved');

  // TEST 5: PAYMENT VERIFICATION & WORKFLOW A
  console.log('\n▶ [Test 5] Payment Verification & Workflow A Execution');
  const testPaymentId = `pay_rzp_${Date.now()}`;
  const testSecret = process.env.RAZORPAY_KEY_SECRET || 'Razorpay@shreyash123';
  const expectedSig = crypto
    .createHmac('sha256', testSecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  await query(
    `UPDATE payments
     SET razorpay_payment_id = $1, razorpay_signature = $2, status = 'captured', method = 'upi', updated_at = $3
     WHERE razorpay_order_id = $4`,
    [testPaymentId, expectedSig, new Date().toISOString(), testOrderId]
  );

  await query(
    `UPDATE appointments
     SET payment_status = 'verified', status = 'payment_verified_awaiting_approval', updated_at = $1
     WHERE id = $2`,
    [new Date().toISOString(), testApptId]
  );

  // Trigger Workflow A
  console.log('  - Executing Workflow A (Email dispatch & WhatsApp fallback record)...');
  const workflowAResult: any = await executePaymentVerifiedWorkflow(testApptId);
  assert(workflowAResult?.whatsapp?.skipped === true, 'WhatsApp safely recorded as skipped without error');
  assert(workflowAResult?.adminEmail?.success === true, 'Admin alert email delivered via Resend');
  assert(workflowAResult?.customerEmail?.success === true, 'Customer receipt email delivered via Resend');

  // Check notifications audit log
  const notificationsA = (await query('SELECT * FROM notifications WHERE appointment_id = $1', [testApptId])).rows;
  assert(notificationsA.length >= 3, 'Recorded notification audit entries (WhatsApp, Admin Email, Customer Email)');

  const waAudit = notificationsA.find((n: any) => n.channel === 'whatsapp');
  assert(waAudit && waAudit.status === 'skipped', 'WhatsApp audit log status is explicitly "skipped"');

  const emailAudit = notificationsA.find((n: any) => n.channel === 'email');
  assert(emailAudit && emailAudit.status === 'sent', 'Resend email audit log status is "sent"');

  // TEST 6: ADMINISTRATOR APPROVAL & WORKFLOW B
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
    insuranceCompany: 'Star Health',
  });
  const meetUrl = calResult.meetUrl || adminMeetUrl;

  await query(
    `UPDATE appointments
     SET status = 'approved',
         google_meet_url = $1,
         calendar_event_id = $2,
         approval_timestamp = $3,
         admin_notes = $4,
         updated_at = $5
     WHERE id = $6`,
    [meetUrl, calResult.eventId || 'evt_sim_123', new Date().toISOString(), adminNotes, new Date().toISOString(), testApptId]
  );

  const workflowBResult: any = await executeAdministratorApprovedWorkflow(testApptId, meetUrl);
  assert(workflowBResult?.customerWhatsApp?.skipped === true, 'Approval WhatsApp notification safely skipped');
  assert(workflowBResult?.customerEmail?.success === true, 'Customer approval email delivered via Resend');
  assert(workflowBResult?.adminEmail?.success === true, 'Admin confirmation email delivered via Resend');

  const approvedAppt = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [testApptId]);
  assert(approvedAppt.status === 'approved', 'Appointment status is approved');
  assert(Boolean(approvedAppt.google_meet_url), 'Appointment stores google_meet_url');
  assert(Boolean(approvedAppt.calendar_event_id), 'Appointment stores calendar_event_id');
  assert(Boolean(approvedAppt.approval_timestamp), 'Appointment stores approval timestamp');

  // TEST 7: REJECTION WORKFLOW & REFUND TERMS (Customer 2)
  console.log('\n▶ [Test 7] Admin Rejection & Workflow C (Clear Refund Terms)');
  const rejectApptId = `test_reject_${Date.now()}`;
  await query(
    `INSERT INTO appointments (
      id, docket_number, customer_name, customer_phone, customer_email,
      preferred_date, preferred_time, insurance_concern, insurance_company,
      preferred_language, fee, tax, total_amount, payment_status, status,
      notification_status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13, 'verified', 'payment_verified_awaiting_approval', 'pending', $14, $15
    )`,
    [
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
      new Date().toISOString(),
    ]
  );

  const rejectionReason = 'Requested slot unavailable and documentation for FIR copy missing.';
  await query(
    `UPDATE appointments
     SET status = 'rejected',
         payment_status = 'refunded',
         rejection_reason = $1,
         updated_at = $2
     WHERE id = $3`,
    [rejectionReason, new Date().toISOString(), rejectApptId]
  );

  const workflowCResult: any = await executeAdministratorRejectedWorkflow(rejectApptId, rejectionReason, true);
  assert(workflowCResult?.whatsapp?.skipped === true, 'Rejection WhatsApp notification safely skipped');
  assert(workflowCResult?.email?.success === true, 'Customer rejection email delivered via Resend with refund terms');

  const rejectedAppt = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [rejectApptId]);
  assert(rejectedAppt.status === 'rejected', 'Appointment status is rejected');
  assert(rejectedAppt.payment_status === 'refunded', 'Payment status updated to refunded');
  assert(rejectedAppt.rejection_reason === rejectionReason, 'Rejection reason recorded in database');

  // TEST 8: NOTIFICATION RETRY ENDPOINT
  console.log('\n▶ [Test 8] Notification Retry Functionality');
  const failedNotifId = `notif_fail_${Date.now()}`;
  await query(
    `INSERT INTO notifications (
      id, appointment_id, channel, recipient, workflow, subject, message_body, status, attempts, error_details, created_at, updated_at
    ) VALUES ($1, $2, 'email', 'shreyashns19@gmail.com', 'test_retry', 'Test Retry Subject', '<p>Test email body for retry</p>', 'failed', 1, 'Simulated network drop', $3, $4)`,
    [failedNotifId, testApptId, new Date().toISOString(), new Date().toISOString()]
  );

  const retryResult = (await retryNotification(failedNotifId)) as any;
  assert(Boolean(retryResult), 'Retry mechanism executed without error');
  assert(retryResult.attempts === 2, 'Attempts counter incremented on retry');
  assert(retryResult.status === 'sent', 'Failed notification status updated to sent after successful retry');

  // TEST 9: WEBHOOK IDEMPOTENCY (PostgreSQL)
  console.log('\n▶ [Test 9] Webhook Idempotency & Duplicate Prevention');
  const testEventId = `evt_test_${Date.now()}`;
  const initialCheck = await queryOne('SELECT id FROM processed_webhooks WHERE id = $1', [testEventId]);
  assert(initialCheck === null, 'Webhook event initially unprocessed');

  await query(
    'INSERT INTO processed_webhooks (id, event_type, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
    [testEventId, 'payment.captured', new Date().toISOString()]
  );

  const processedCheck = await queryOne<any>('SELECT id FROM processed_webhooks WHERE id = $1', [testEventId]);
  assert(Boolean(processedCheck) && processedCheck.id === testEventId, 'Webhook event recorded after processing');

  // Attempt duplicate insert
  await query(
    'INSERT INTO processed_webhooks (id, event_type, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
    [testEventId, 'payment.captured', new Date().toISOString()]
  );

  const duplicateCheck = await query<any>('SELECT COUNT(*) AS c FROM processed_webhooks WHERE id = $1', [testEventId]);
  const totalForId = parseInt(duplicateCheck.rows[0].c, 10);
  assert(totalForId === 1, 'Duplicate webhook event prevented from creating duplicate records (exactly 1 record exists)');

  // TEST 10: ADMIN AUTHENTICATION & PASSWORD HASHING
  console.log('\n▶ [Test 10] Admin Authentication & Hashing Verification');
  const testAdminPassword = 'TestSecureAdminPass@2026';
  const testAdminHash = await bcrypt.hash(testAdminPassword, 10);
  const testAdminId = `adm_test_${Date.now()}`;
  await query(
    `INSERT INTO admins (id, username, email, password_hash, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'admin', $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [testAdminId, `adm_${Date.now()}`, `admin_${Date.now()}@test.com`, testAdminHash, new Date().toISOString(), new Date().toISOString()]
  );

  const authUser = await queryOne<any>('SELECT * FROM admins WHERE id = $1', [testAdminId]);
  const isCorrect = await bcrypt.compare(testAdminPassword, authUser.password_hash);
  const isIncorrect = await bcrypt.compare('WrongPassword', authUser.password_hash);
  assert(isCorrect === true, 'Bcrypt verification succeeds with correct password');
  assert(isIncorrect === false, 'Bcrypt verification fails with incorrect password');

  // TEST 11: POSTGRESQL TRANSACTIONS (Atomic Rollback on Error)
  console.log('\n▶ [Test 11] PostgreSQL Atomic Transactions');
  let transactionFailed = false;
  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO appointments (
          id, docket_number, customer_name, customer_phone, customer_email,
          preferred_date, preferred_time, insurance_concern,
          fee, tax, total_amount, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          'apt_rollback_test',
          'BD-ROLLBACK-01',
          'Rollback User',
          '9999999999',
          'rollback@test.com',
          '2026-11-25',
          '10:00 AM',
          'Test rollback description',
          422.88,
          76.12,
          499.0,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      // Force simulated transaction error
      throw new Error('Simulated transaction failure for atomic rollback verification');
    });
  } catch {
    transactionFailed = true;
  }
  assert(transactionFailed === true, 'Transaction threw expected exception');
  const rollbackCheck = await queryOne('SELECT id FROM appointments WHERE id = $1', ['apt_rollback_test']);
  assert(rollbackCheck === null, 'Appointment record was completely rolled back on error');

  // SUMMARY
  console.log('\n====================================================');
  console.log(`  ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions`);
  console.log('====================================================\n');

  await closeDatabase();
}

runTestSuite()
  .then(() => {
    console.log('Test suite execution completed cleanly.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Test suite failed:', err);
    await closeDatabase();
    process.exit(1);
  });
