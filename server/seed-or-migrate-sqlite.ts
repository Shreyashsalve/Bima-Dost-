import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';
import { getPool, closeDatabase, initDatabase } from './db.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrateSqliteToPostgres() {
  console.log('========================================================================');
  console.log('[SQLite -> PostgreSQL Data Migration] Starting data migration utility...');
  console.log('========================================================================');

  const sqlitePath = path.resolve(process.cwd(), 'data', 'bimadost.db');

  if (!fs.existsSync(sqlitePath)) {
    console.log('[Migration] No SQLite database found at data/bimadost.db. Nothing to import.');
    return;
  }

  // Ensure PostgreSQL schema is initialized first
  await initDatabase();

  // Load better-sqlite3 safely
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const sqliteDb = new Database(sqlitePath, { readonly: true });
  const pgPool = getPool();

  console.log('[Migration] Connected to SQLite database in READONLY mode.');

  try {
    // 1. MIGRATE ADMINS
    const sqliteAdmins = sqliteDb.prepare('SELECT * FROM admins').all() as any[];
    console.log(`[Migration] Found ${sqliteAdmins.length} admin(s) in SQLite.`);
    let importedAdmins = 0;
    for (const admin of sqliteAdmins) {
      const res = await pgPool.query(
        `INSERT INTO admins (id, username, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [admin.id, admin.username, admin.email, admin.password_hash, admin.role || 'admin', admin.created_at, admin.updated_at]
      );
      if ((res.rowCount ?? 0) > 0) importedAdmins++;
    }
    console.log(`  ✅ Admins: imported ${importedAdmins} new record(s).`);

    // 2. MIGRATE APPOINTMENTS
    const sqliteAppointments = sqliteDb.prepare('SELECT * FROM appointments').all() as any[];
    console.log(`[Migration] Found ${sqliteAppointments.length} appointment(s) in SQLite.`);
    let importedAppointments = 0;
    for (const apt of sqliteAppointments) {
      const res = await pgPool.query(
        `INSERT INTO appointments (
          id, docket_number, customer_name, customer_phone, customer_email,
          preferred_date, preferred_time, insurance_concern, insurance_company,
          preferred_language, fee, tax, total_amount, payment_status, status,
          google_meet_url, calendar_event_id, approval_timestamp, rejection_reason,
          admin_notes, notification_status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22, $23
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          apt.id,
          apt.docket_number,
          apt.customer_name,
          apt.customer_phone,
          apt.customer_email,
          apt.preferred_date,
          apt.preferred_time,
          apt.insurance_concern,
          apt.insurance_company || null,
          apt.preferred_language || 'English',
          apt.fee,
          apt.tax,
          apt.total_amount,
          apt.payment_status,
          apt.status,
          apt.google_meet_url || null,
          apt.calendar_event_id || null,
          apt.approval_timestamp || null,
          apt.rejection_reason || null,
          apt.admin_notes || null,
          apt.notification_status || 'pending',
          apt.created_at,
          apt.updated_at,
        ]
      );
      if ((res.rowCount ?? 0) > 0) importedAppointments++;
    }
    console.log(`  ✅ Appointments: imported ${importedAppointments} new record(s).`);

    // 3. MIGRATE PAYMENTS
    const sqlitePayments = sqliteDb.prepare('SELECT * FROM payments').all() as any[];
    console.log(`[Migration] Found ${sqlitePayments.length} payment(s) in SQLite.`);
    let importedPayments = 0;
    for (const pay of sqlitePayments) {
      const res = await pgPool.query(
        `INSERT INTO payments (
          id, appointment_id, razorpay_order_id, razorpay_payment_id,
          razorpay_signature, amount, currency, status, method,
          error_description, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          pay.id,
          pay.appointment_id,
          pay.razorpay_order_id,
          pay.razorpay_payment_id || null,
          pay.razorpay_signature || null,
          pay.amount,
          pay.currency || 'INR',
          pay.status,
          pay.method || null,
          pay.error_description || null,
          pay.created_at,
          pay.updated_at,
        ]
      );
      if ((res.rowCount ?? 0) > 0) importedPayments++;
    }
    console.log(`  ✅ Payments: imported ${importedPayments} new record(s).`);

    // 4. MIGRATE NOTIFICATIONS
    const sqliteNotifications = sqliteDb.prepare('SELECT * FROM notifications').all() as any[];
    console.log(`[Migration] Found ${sqliteNotifications.length} notification(s) in SQLite.`);
    let importedNotifications = 0;
    for (const notif of sqliteNotifications) {
      const res = await pgPool.query(
        `INSERT INTO notifications (
          id, appointment_id, channel, recipient, workflow,
          subject, message_body, status, service_response, error_details,
          attempts, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          notif.id,
          notif.appointment_id,
          notif.channel,
          notif.recipient,
          notif.workflow,
          notif.subject || null,
          notif.message_body,
          notif.status,
          notif.service_response || null,
          notif.error_details || null,
          notif.attempts || 1,
          notif.created_at,
          notif.updated_at,
        ]
      );
      if ((res.rowCount ?? 0) > 0) importedNotifications++;
    }
    console.log(`  ✅ Notifications: imported ${importedNotifications} new record(s).`);

    // 5. MIGRATE PROCESSED WEBHOOKS
    try {
      const sqliteWebhooks = sqliteDb.prepare('SELECT * FROM processed_webhooks').all() as any[];
      let importedWebhooks = 0;
      for (const wh of sqliteWebhooks) {
        const res = await pgPool.query(
          `INSERT INTO processed_webhooks (id, event_type, created_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [wh.id, wh.event_type, wh.created_at]
        );
        if ((res.rowCount ?? 0) > 0) importedWebhooks++;
      }
      console.log(`  ✅ Processed Webhooks: imported ${importedWebhooks} new record(s).`);
    } catch {
      // processed_webhooks may be empty or uncreated
    }

    // 6. VALIDATE RECORD COUNTS AND INTEGRITY
    console.log('\n[Validation] Checking PostgreSQL row counts after import:');
    const pgAdmins = (await pgPool.query('SELECT COUNT(*) AS c FROM admins')).rows[0].c;
    const pgAppointments = (await pgPool.query('SELECT COUNT(*) AS c FROM appointments')).rows[0].c;
    const pgPayments = (await pgPool.query('SELECT COUNT(*) AS c FROM payments')).rows[0].c;
    const pgNotifications = (await pgPool.query('SELECT COUNT(*) AS c FROM notifications')).rows[0].c;

    console.log(`  • Admins: SQLite=${sqliteAdmins.length} -> PostgreSQL=${pgAdmins}`);
    console.log(`  • Appointments: SQLite=${sqliteAppointments.length} -> PostgreSQL=${pgAppointments}`);
    console.log(`  • Payments: SQLite=${sqlitePayments.length} -> PostgreSQL=${pgPayments}`);
    console.log(`  • Notifications: SQLite=${sqliteNotifications.length} -> PostgreSQL=${pgNotifications}`);

    console.log('========================================================================');
    console.log('[SQLite -> PostgreSQL Data Migration] Data migration completed successfully.');
    console.log('Original SQLite database preserved untouched at data/bimadost.db.');
    console.log('========================================================================');
  } finally {
    sqliteDb.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed-or-migrate-sqlite.ts')) {
  migrateSqliteToPostgres()
    .then(async () => {
      await closeDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Migration Error]:', err);
      await closeDatabase();
      process.exit(1);
    });
}
