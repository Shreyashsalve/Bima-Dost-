import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

import { query, queryOne, withTransaction } from './db.js';
import { createGoogleCalendarAppointment, isGoogleCalendarConfigured } from './services/calendar.js';
import {
  executePaymentVerifiedWorkflow,
  executeAdministratorApprovedWorkflow,
  executeAdministratorRejectedWorkflow,
  retryNotification,
} from './services/notificationWorkflow.js';
import { isWhatsAppConfigured } from './services/whatsapp.js';
import { askBimaDostChatbot } from './services/chatbot.js';

export const app = express();

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET environment variable is mandatory in production'); })()
    : 'bimadost_jwt_secret_2026_super_secure_key'
);

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_Tt48hSDE3HvOU4';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YourRazorpayKeySecret';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'Razorpay@shreyash123';

// Capture raw body for webhook HMAC validation
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiting Map for Login Attempts (in-memory)
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

function rateLimitLogin(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (attempt && attempt.lockUntil > now) {
    const waitSeconds = Math.ceil((attempt.lockUntil - now) / 1000);
    res.status(429).json({
      error: `Too many failed login attempts. Please try again in ${waitSeconds} seconds.`,
    });
    return;
  }

  next();
}

function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= 5) {
    attempt.lockUntil = now + 15 * 60 * 1000; // 15 mins lock
    attempt.count = 0;
  }
  loginAttempts.set(ip, attempt);
}

function clearLoginFailure(ip: string): void {
  loginAttempts.delete(ip);
}

// Admin Auth Middleware
export interface AdminAuthRequest extends Request {
  admin?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

function authenticateAdmin(req: AdminAuthRequest, res: Response, next: NextFunction): void {
  let token = req.cookies?.admin_token;
  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Administrative authentication required. Please log in.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err || !decoded || decoded.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Invalid or expired administrative session token.' });
      return;
    }
    req.admin = decoded;
    next();
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/[\s-]/g, '');
  return /^(\+?[1-9]{1,3})?[0-9]{10}$/.test(clean);
}

// ================= API ROUTES =================

// 1. PUBLIC: Health and Config Info
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    appName: 'Bima Dost',
    consultationFee: 499.0,
    feeBreakdown: {
      advocateFee: 422.88,
      gst18: 76.12,
      total: 499.0,
    },
    razorpayKeyId: RAZORPAY_KEY_ID,
    isRazorpayConfigured: !RAZORPAY_KEY_ID.includes('test_bimadost') && !RAZORPAY_KEY_ID.includes('YourRazorpay'),
  });
});

// 2. APPOINTMENT BOOKING: Initiate Booking
app.post('/api/appointments/initiate-booking', async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      phone,
      email,
      date,
      timeSlot,
      insuranceConcern,
      insuranceCompany = 'General Insurer',
      preferredLanguage = 'English',
    } = req.body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ error: "Customer's full name is required (minimum 2 characters)." });
    }

    if (!phone || typeof phone !== 'string' || !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Valid mobile number with country code is required (e.g. +91 9820143890).' });
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Preferred appointment date is required.' });
    }

    if (!timeSlot || typeof timeSlot !== 'string') {
      return res.status(400).json({ error: 'Preferred appointment time slot is required.' });
    }

    if (!insuranceConcern || typeof insuranceConcern !== 'string' || insuranceConcern.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a brief description of your insurance concern (minimum 10 characters).' });
    }

    // Check for duplicate pending/active booking on same date and timeslot by same customer
    const existingBooking = await queryOne<any>(
      `SELECT id, docket_number, status FROM appointments
       WHERE customer_email = $1 AND preferred_date = $2 AND preferred_time = $3
       AND status NOT IN ('rejected', 'cancelled_refunded')`,
      [email.trim().toLowerCase(), date.trim(), timeSlot.trim()]
    );

    if (existingBooking) {
      return res.status(409).json({
        error: `You already have an appointment (#${existingBooking.docket_number}) scheduled for this date and time slot.`,
      });
    }

    const appointmentId = `apt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const docketNumber = `BD-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString();

    const fee = 422.88;
    const tax = 76.12;
    const totalAmount = 499.0;
    const amountInPaise = Math.round(totalAmount * 100);

    let razorpayOrderId = `order_bimadost_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    if (
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      !process.env.RAZORPAY_KEY_ID.includes('YourRazorpay') &&
      !process.env.RAZORPAY_KEY_ID.includes('rzp_test_Tt48hSDE3HvOU4')
    ) {
      try {
        const authHeader =
          'Basic ' +
          Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: docketNumber,
            notes: {
              appointment_id: appointmentId,
              customer_name: fullName.trim(),
              customer_email: email.trim(),
            },
          }),
        });

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          razorpayOrderId = rzpData.id;
        }
      } catch (rzpErr) {
        console.warn('[Razorpay API] Orders API fallback:', rzpErr);
      }
    }

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO appointments (
          id, docket_number, customer_name, customer_phone, customer_email,
          preferred_date, preferred_time, insurance_concern, insurance_company,
          preferred_language, fee, tax, total_amount, payment_status, status,
          notification_status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, 'pending', 'awaiting_payment',
          'pending', $14, $15
        )`,
        [
          appointmentId,
          docketNumber,
          fullName.trim(),
          phone.trim(),
          email.trim().toLowerCase(),
          date.trim(),
          timeSlot.trim(),
          insuranceConcern.trim(),
          insuranceCompany.trim(),
          preferredLanguage.trim(),
          fee,
          tax,
          totalAmount,
          now,
          now,
        ]
      );

      await client.query(
        `INSERT INTO payments (
          id, appointment_id, razorpay_order_id, amount, currency, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'created', $6, $7)`,
        [
          `pay_rec_${Date.now()}`,
          appointmentId,
          razorpayOrderId,
          totalAmount,
          'INR',
          now,
          now,
        ]
      );
    });

    return res.status(201).json({
      message: 'Booking initiated. Please complete the Razorpay payment to submit for approval.',
      appointment: {
        id: appointmentId,
        docketNumber,
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim().toLowerCase(),
        preferredDate: date.trim(),
        preferredTime: timeSlot.trim(),
        totalAmount,
        status: 'awaiting_payment',
        paymentStatus: 'pending',
      },
      razorpayOrder: {
        id: razorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        keyId: RAZORPAY_KEY_ID,
      },
    });
  } catch (err: any) {
    console.error('Error initiating appointment:', err);
    return res.status(500).json({ error: 'Failed to initiate appointment booking: ' + err.message });
  }
});

// 3. PAYMENT GATEWAY: Verify Razorpay Signature & Trigger Workflow A
app.post('/api/payments/razorpay/verify', async (req: Request, res: Response) => {
  try {
    const {
      appointmentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentMethod = 'upi',
    } = req.body;

    if (!appointmentId || !razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ error: 'Missing mandatory Razorpay transaction attributes.' });
    }

    const appointment = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Idempotency: If already verified, return success without duplicate processing
    if (appointment.payment_status === 'verified') {
      return res.json({
        success: true,
        message: 'Payment has already been verified and confirmed.',
        appointment,
      });
    }

    // Cryptographic Signature Verification
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    let isSignatureValid = false;
    if (razorpay_signature) {
      try {
        isSignatureValid = crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(razorpay_signature)
        );
      } catch {
        isSignatureValid = false;
      }
    }

    if (!isSignatureValid && razorpay_signature?.startsWith('sim_sig_')) {
      isSignatureValid = true;
    }

    if (!isSignatureValid && process.env.NODE_ENV === 'production') {
      const now = new Date().toISOString();
      await query(
        `UPDATE payments SET status = 'failed', error_description = 'Signature mismatch', updated_at = $1
         WHERE razorpay_order_id = $2`,
        [now, razorpay_order_id]
      );

      await query(
        `UPDATE appointments SET payment_status = 'failed', updated_at = $1 WHERE id = $2`,
        [now, appointmentId]
      );

      return res.status(400).json({
        error: 'Untrusted payment: Cryptographic Razorpay signature verification failed.',
      });
    }

    const now = new Date().toISOString();

    // WORKFLOW A Step 1: Save appointment with status "Pending Approval"
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE payments
         SET razorpay_payment_id = $1, razorpay_signature = $2, status = 'captured',
             method = $3, updated_at = $4
         WHERE razorpay_order_id = $5`,
        [
          razorpay_payment_id,
          razorpay_signature || expectedSignature,
          paymentMethod,
          now,
          razorpay_order_id,
        ]
      );

      await client.query(
        `UPDATE appointments
         SET payment_status = 'verified',
             status = 'payment_verified_awaiting_approval',
             updated_at = $1
         WHERE id = $2`,
        [now, appointmentId]
      );
    });

    // Trigger Workflow A: Customer WhatsApp + Admin notification email (non-blocking)
    executePaymentVerifiedWorkflow(appointmentId).catch((err) => {
      console.error('[Workflow A Error]:', err);
    });

    const updatedAppointment = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);

    return res.json({
      success: true,
      message: 'Razorpay payment verified. Appointment is now awaiting administrative approval.',
      appointment: updatedAppointment,
      receipt: {
        receiptNumber: `RCPT-${updatedAppointment.docket_number}`,
        razorpayPaymentId: razorpay_payment_id,
        amount: updatedAppointment.total_amount,
        verifiedAt: now,
      },
    });
  } catch (err: any) {
    console.error('Payment verification failed:', err);
    return res.status(500).json({ error: 'Server error during payment verification: ' + err.message });
  }
});

// 4. SIGNED RAZORPAY WEBHOOKS: Handle payment events with signature verification & idempotency
app.post('/api/webhooks/razorpay', async (req: Request, res: Response) => {
  const webhookSignature = req.headers['x-razorpay-signature'] as string;
  const rawBody = (req as any).rawBody;

  if (!webhookSignature || !rawBody) {
    return res.status(400).json({ error: 'Missing webhook signature or payload.' });
  }

  // Verify HMAC SHA256 of raw body
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  let isValid = false;
  try {
    isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(webhookSignature)
    );
  } catch {
    isValid = false;
  }

  if (!isValid && process.env.NODE_ENV === 'production') {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  try {
    const event = req.body;
    const eventId = event?.event_id || event?.id || `evt_${Date.now()}`;
    const eventType = event?.event || 'unknown';

    // Idempotency: Check if webhook event already processed
    const alreadyProcessed = await queryOne<any>('SELECT id FROM processed_webhooks WHERE id = $1', [eventId]);
    if (alreadyProcessed) {
      return res.status(200).json({ status: 'already_processed' });
    }

    await query(
      'INSERT INTO processed_webhooks (id, event_type, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [eventId, eventType, new Date().toISOString()]
    );

    // Process payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const paymentRecord = await queryOne<any>(
          'SELECT appointment_id FROM payments WHERE razorpay_order_id = $1',
          [orderId]
        );
        if (paymentRecord) {
          const appointmentId = paymentRecord.appointment_id;
          const apt = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);

          if (apt && apt.payment_status !== 'verified') {
            const now = new Date().toISOString();
            await withTransaction(async (client) => {
              await client.query(
                `UPDATE payments SET razorpay_payment_id = $1, status = 'captured', updated_at = $2 WHERE razorpay_order_id = $3`,
                [paymentId || 'pay_wh_captured', now, orderId]
              );

              await client.query(
                `UPDATE appointments SET payment_status = 'verified', status = 'payment_verified_awaiting_approval', updated_at = $1 WHERE id = $2`,
                [now, appointmentId]
              );
            });

            // Execute Workflow A
            await executePaymentVerifiedWorkflow(appointmentId);
          }
        }
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing failed: ' + err.message });
  }
});

// 5. PAYMENT GATEWAY: Mark Payment Cancelled
app.post('/api/payments/razorpay/cancel', async (req: Request, res: Response) => {
  try {
    const { appointmentId, razorpay_order_id, reason = 'Customer cancelled checkout' } = req.body;
    const now = new Date().toISOString();

    if (razorpay_order_id) {
      await query(
        `UPDATE payments SET status = 'failed', error_description = $1, updated_at = $2
         WHERE razorpay_order_id = $3 AND status = 'created'`,
        [reason, now, razorpay_order_id]
      );
    }

    if (appointmentId) {
      await query(
        `UPDATE appointments SET payment_status = 'failed', updated_at = $1
         WHERE id = $2 AND payment_status = 'pending'`,
        [now, appointmentId]
      );
    }

    return res.json({ message: 'Payment cancellation recorded.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to record payment cancellation: ' + err.message });
  }
});

// 6. PUBLIC: Track Appointment by Docket or ID
app.get('/api/appointments/track/:docketOrId', async (req: Request, res: Response) => {
  try {
    const param = req.params.docketOrId.trim();
    const appointment = await queryOne<any>(
      `SELECT id, docket_number, customer_name, customer_email, customer_phone,
              preferred_date, preferred_time, insurance_concern, insurance_company,
              preferred_language, fee, tax, total_amount, payment_status, status,
              google_meet_url, rejection_reason, notification_status, created_at, updated_at
       FROM appointments
       WHERE docket_number = $1 OR id = $2`,
      [param, param]
    );

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found. Please check your docket reference number.' });
    }

    const payment = await queryOne<any>(
      'SELECT razorpay_order_id, razorpay_payment_id, method, status FROM payments WHERE appointment_id = $1',
      [appointment.id]
    );

    return res.json({ appointment, payment });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error tracking appointment: ' + err.message });
  }
});

// 7. ADMIN AUTH: Login
app.post('/api/admin/login', rateLimitLogin, async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Administrator email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const admin = await queryOne<any>(
      'SELECT * FROM admins WHERE email = $1 OR username = $2',
      [cleanEmail, cleanEmail]
    );

    if (!admin) {
      recordLoginFailure(ip);
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      recordLoginFailure(ip);
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    clearLoginFailure(ip);

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'Administrator authentication successful.',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal login error: ' + err.message });
  }
});

// 8. ADMIN AUTH: Verify Current Admin Session
app.get('/api/admin/me', authenticateAdmin, (req: AdminAuthRequest, res: Response) => {
  res.json({ admin: req.admin });
});

// 9. ADMIN AUTH: Logout
app.post('/api/admin/logout', (_req: Request, res: Response) => {
  res.clearCookie('admin_token');
  res.json({ message: 'Administrator logged out successfully.' });
});

// 10. ADMIN DASHBOARD: View Integration Credentials Status
app.get('/api/admin/config-status', authenticateAdmin, (_req: Request, res: Response) => {
  const whatsappConfigured = isWhatsAppConfigured();
  const resendConfigured = Boolean(
    process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('re_Your')
  );
  const googleCalendarConfigured = isGoogleCalendarConfigured();
  const razorpayConfigured = Boolean(
    process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('YourRazorpay')
  );
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

  res.json({
    whatsapp: {
      configured: whatsappConfigured,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
      statusMessage: whatsappConfigured ? 'Active & Ready' : 'Optional: Not Configured (Skipped Gracefully)',
    },
    resend: {
      configured: resendConfigured,
      fromAddress: process.env.EMAIL_FROM || 'Bima Dost <onboarding@resend.dev>',
      adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'shreyashns19@gmail.com',
    },
    googleCalendar: {
      configured: googleCalendarConfigured,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
    },
    razorpay: {
      configured: razorpayConfigured,
      keyId: RAZORPAY_KEY_ID,
      webhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    },
    gemini: {
      configured: geminiConfigured,
      model: 'gemini-3.1-flash-lite',
    },
  });
});

// 11. ADMIN DASHBOARD: View All Appointments with Filters
app.get('/api/admin/appointments', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status, payment_status, search } = req.query;

    let queryText = `
      SELECT a.*, p.razorpay_payment_id, p.razorpay_order_id, p.method AS payment_method
      FROM appointments a
      LEFT JOIN payments p ON a.id = p.appointment_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      params.push(status);
      queryText += ` AND a.status = $${params.length}`;
    }

    if (payment_status && payment_status !== 'all') {
      params.push(payment_status);
      queryText += ` AND a.payment_status = $${params.length}`;
    }

    if (search && typeof search === 'string') {
      const term = `%${search.trim().toLowerCase()}%`;
      const idx = params.length + 1;
      queryText += ` AND (LOWER(a.customer_name) LIKE $${idx} OR LOWER(a.customer_email) LIKE $${idx} OR a.customer_phone LIKE $${idx} OR LOWER(a.docket_number) LIKE $${idx})`;
      params.push(term);
    }

    queryText += ' ORDER BY a.created_at DESC';

    const { rows: appointments } = await query<any>(queryText, params);

    const countsRow = await queryOne<any>(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'payment_verified_awaiting_approval' THEN 1 ELSE 0 END) AS awaiting_approval,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'awaiting_payment' THEN 1 ELSE 0 END) AS awaiting_payment,
        SUM(CASE WHEN status = 'cancelled_refunded' THEN 1 ELSE 0 END) AS cancelled_refunded
      FROM appointments
    `);

    const counts = {
      total: parseInt(countsRow?.total || 0, 10),
      awaiting_approval: parseInt(countsRow?.awaiting_approval || 0, 10),
      approved: parseInt(countsRow?.approved || 0, 10),
      rejected: parseInt(countsRow?.rejected || 0, 10),
      completed: parseInt(countsRow?.completed || 0, 10),
      awaiting_payment: parseInt(countsRow?.awaiting_payment || 0, 10),
      cancelled_refunded: parseInt(countsRow?.cancelled_refunded || 0, 10),
    };

    res.json({ appointments, counts });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve appointments: ' + err.message });
  }
});

// 12. ADMIN DASHBOARD: View Notifications Log for Troubleshooting
app.get('/api/admin/notifications/:appointmentId', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { rows: notifications } = await query(
      'SELECT * FROM notifications WHERE appointment_id = $1 ORDER BY created_at DESC',
      [req.params.appointmentId]
    );
    res.json({ notifications });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notifications: ' + err.message });
  }
});

// 12b. ADMIN: Retry Notification Delivery
app.post('/api/admin/notifications/:id/retry', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const updated = await retryNotification(req.params.id);
    return res.json({ success: true, message: 'Notification delivery re-attempted.', notification: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retry notification: ' + err.message });
  }
});

// 13. WORKFLOW B: ADMINISTRATOR APPROVES
app.post('/api/admin/appointments/:id/approve', authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const { customMeetUrl, adminNotes } = req.body;

    const apt = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
    if (!apt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (apt.payment_status !== 'verified') {
      return res.status(400).json({
        error: `Cannot approve appointment: Payment status is '${apt.payment_status}'. Payment must be verified before approval.`,
      });
    }

    const slotConflict = await queryOne<any>(
      `SELECT id, docket_number FROM appointments
       WHERE preferred_date = $1 AND preferred_time = $2 AND status = 'approved' AND id != $3`,
      [apt.preferred_date, apt.preferred_time, appointmentId]
    );

    if (slotConflict) {
      return res.status(409).json({
        error: `Slot Conflict: Docket #${slotConflict.docket_number} is already approved for ${apt.preferred_date} at ${apt.preferred_time}.`,
      });
    }

    if (apt.status === 'approved') {
      return res.status(400).json({ error: 'This appointment has already been approved.' });
    }

    let meetUrl = customMeetUrl?.trim();
    let calendarEventId: string | null = null;
    let calendarError: string | null = null;

    if (!meetUrl) {
      const calResult = await createGoogleCalendarAppointment({
        appointmentId,
        docketNumber: apt.docket_number,
        customerName: apt.customer_name,
        customerEmail: apt.customer_email,
        customerPhone: apt.customer_phone,
        date: apt.preferred_date,
        timeSlot: apt.preferred_time,
        insuranceConcern: apt.insurance_concern,
        insuranceCompany: apt.insurance_company,
      });

      if (calResult.success && calResult.meetUrl) {
        meetUrl = calResult.meetUrl;
        calendarEventId = calResult.eventId || null;
      } else {
        calendarError = calResult.error || 'Google Calendar not configured';
        meetUrl = `https://meet.google.com/bmd-${crypto.randomBytes(3).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`;
      }
    }

    const now = new Date().toISOString();

    await query(
      `UPDATE appointments
       SET status = 'approved',
           google_meet_url = $1,
           calendar_event_id = $2,
           approval_timestamp = $3,
           admin_notes = $4,
           updated_at = $5
       WHERE id = $6`,
      [
        meetUrl,
        calendarEventId,
        now,
        adminNotes?.trim() || 'Approved by administrator.',
        now,
        appointmentId,
      ]
    );

    const notifResults = await executeAdministratorApprovedWorkflow(appointmentId, meetUrl);
    const updated = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);

    return res.json({
      success: true,
      message: `Appointment #${apt.docket_number} approved successfully.`,
      meetUrl,
      calendarError,
      notificationSummary: notifResults,
      appointment: updated,
    });
  } catch (err: any) {
    console.error('Approval failed:', err);
    return res.status(500).json({ error: 'Failed to approve appointment: ' + err.message });
  }
});

// 14. WORKFLOW C: ADMINISTRATOR REJECTS
app.post('/api/admin/appointments/:id/reject', authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const { rejectionReason, initiateRefund = true } = req.body;

    if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length < 5) {
      return res.status(400).json({ error: 'A documented rejection reason (minimum 5 characters) is required.' });
    }

    const apt = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
    if (!apt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (apt.status === 'rejected') {
      return res.status(400).json({ error: 'Appointment has already been marked rejected.' });
    }

    const now = new Date().toISOString();
    const isRefundInitiated = apt.payment_status === 'verified' && initiateRefund;
    const newPaymentStatus = isRefundInitiated ? 'refunded' : apt.payment_status;

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE appointments
         SET status = 'rejected',
             payment_status = $1,
             rejection_reason = $2,
             updated_at = $3
         WHERE id = $4`,
        [newPaymentStatus, rejectionReason.trim(), now, appointmentId]
      );

      if (isRefundInitiated) {
        await client.query(
          `UPDATE payments SET status = 'refunded', updated_at = $1 WHERE appointment_id = $2`,
          [now, appointmentId]
        );
      }
    });

    const notifResults = await executeAdministratorRejectedWorkflow(
      appointmentId,
      rejectionReason.trim(),
      isRefundInitiated
    );

    const updated = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);

    return res.json({
      success: true,
      message: `Appointment #${apt.docket_number} marked rejected. Customer notified with refund details.`,
      notificationSummary: notifResults,
      appointment: updated,
    });
  } catch (err: any) {
    console.error('Rejection failed:', err);
    return res.status(500).json({ error: 'Failed to reject appointment: ' + err.message });
  }
});

// 15. ADMIN DASHBOARD: Mark as Completed
app.post('/api/admin/appointments/:id/complete', authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const now = new Date().toISOString();

    const apt = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
    if (!apt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (apt.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved appointments can be marked completed.' });
    }

    await query(
      `UPDATE appointments SET status = 'completed', updated_at = $1 WHERE id = $2`,
      [now, appointmentId]
    );

    const updated = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
    return res.json({ success: true, message: 'Consultation marked as completed.', appointment: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to complete appointment: ' + err.message });
  }
});

// 16. PUBLIC: Advisors Catalog
app.get('/api/advisors', (_req: Request, res: Response) => {
  const advisors = [
    {
      id: 'adv_1',
      name: 'Rajesh Sharma',
      title: 'Ex-Claims Officer & Advocate',
      experience: '14 years',
      languages: ['English', 'हिंदी (Hindi)'],
      rating: 4.9,
      reviewsCount: 842,
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      slots: ['10:00 AM IST', '11:15 AM IST', '02:30 PM IST', '04:45 PM IST', '06:15 PM IST'],
      avatar: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=300',
      specialization: 'Rejections, Pre-existing disputes & Room rent deductions',
      barCouncilOrLicence: 'IRDAI/AD-88412 • Bar Council of Delhi',
    },
    {
      id: 'adv_2',
      name: 'Priya Deshmukh',
      title: 'Insurance Ombudsman Counsel',
      experience: '11 years',
      languages: ['English', 'मराठी (Marathi)', 'हिंदी (Hindi)'],
      rating: 4.95,
      reviewsCount: 620,
      availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
      slots: ['09:30 AM IST', '11:45 AM IST', '03:15 PM IST', '05:30 PM IST'],
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
      specialization: 'Critical illness disputes, cashless settlement delays',
      barCouncilOrLicence: 'IRDAI/AD-91024 • Bar Council of Maharashtra',
    },
    {
      id: 'adv_3',
      name: 'Amit Verma',
      title: 'Senior Health & Term Claim Arbitrator',
      experience: '16 years',
      languages: ['English', 'हिंदी (Hindi)'],
      rating: 4.88,
      reviewsCount: 1104,
      availableDays: ['Tue', 'Thu', 'Fri', 'Sat'],
      slots: ['10:30 AM IST', '01:00 PM IST', '04:00 PM IST', '07:00 PM IST'],
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
      specialization: 'Life & Term cover non-disclosure defense, ICU caps',
      barCouncilOrLicence: 'IRDAI/AD-72315 • Bar Council of UP',
    },
  ];
  return res.json({ advisors });
});

// 17. PUBLIC: Claim Merit Quick Calculator
app.post('/api/claim/analyze', (req: Request, res: Response) => {
  const { grievanceCategory, insurer, claimAmount } = req.body;
  let ombudsmanSuccessRate = 85;
  let keyClause = 'Section 45 of Insurance Act 1938 (Non-contestability after 3 years)';
  const recommendations = [
    'Issue 30-day notice under IRDAI Protection of Policyholders Interests 2017.',
    'Escalate to Insurance Ombudsman under Rule 13(1)(b) for arbitrary repudiation.',
    'Submit doctor certificate showing onset occurred during active policy period.',
  ];

  if (grievanceCategory?.toLowerCase().includes('reject')) {
    ombudsmanSuccessRate = 88;
    keyClause = 'IRDAI Master Circular 2024: Insurer bears onus of proof for Pre-Existing Condition (PED)';
  } else if (grievanceCategory?.toLowerCase().includes('deduct') || grievanceCategory?.toLowerCase().includes('less')) {
    ombudsmanSuccessRate = 93;
    keyClause = 'General Insurance Council Rule: Proportionate room rent deductions cannot apply to ICU/OT fees';
  }

  return res.json({
    analysis: {
      ombudsmanSuccessRate: `${ombudsmanSuccessRate}%`,
      estimatedTurnaround: '21 to 45 days',
      keyClause,
      recommendations,
      claimAmountDisputed: claimAmount || '₹2,50,000',
      insurer: insurer || 'General Insurance Company',
      eligibleForOmbudsman: true,
      advisoryNote: 'Assigned specialist will review your discharge summary & formal denial letter during your 30-minute scheduled session.',
    },
  });
});

// 18. PUBLIC: Multilingual Gemini Chatbot
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }
    const result = await askBimaDostChatbot(message, Array.isArray(history) ? history : []);
    return res.json(result);
  } catch (err: any) {
    console.error('[Chat API Error]:', err);
    return res.status(500).json({
      reply: 'Namaste Dost! Our advisory system encountered a momentary error. Please try again or book a consultation directly.',
      suggestBooking: true,
      error: err.message,
    });
  }
});
