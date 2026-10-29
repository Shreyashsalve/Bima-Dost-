import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'bimadost.db');
export const db = new Database(dbPath);

// Enable WAL mode and foreign keys for production robustness
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize Schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      docket_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      preferred_date TEXT NOT NULL,
      preferred_time TEXT NOT NULL,
      insurance_concern TEXT NOT NULL,
      insurance_company TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'English',
      fee REAL NOT NULL DEFAULT 422.88,
      tax REAL NOT NULL DEFAULT 76.12,
      total_amount REAL NOT NULL DEFAULT 499.00,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('pending', 'verified', 'failed', 'refunded')) DEFAULT 'pending',
      status TEXT NOT NULL CHECK(status IN (
        'awaiting_payment',
        'payment_verified_awaiting_approval',
        'approved',
        'rejected',
        'completed',
        'cancelled_refunded'
      )) DEFAULT 'awaiting_payment',
      google_meet_url TEXT,
      calendar_event_id TEXT,
      approval_timestamp TEXT,
      rejection_reason TEXT,
      admin_notes TEXT,
      notification_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      razorpay_order_id TEXT NOT NULL UNIQUE,
      razorpay_payment_id TEXT UNIQUE,
      razorpay_signature TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL CHECK(status IN ('created', 'captured', 'failed', 'refunded')) DEFAULT 'created',
      method TEXT,
      error_description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      channel TEXT NOT NULL CHECK(channel IN ('whatsapp', 'email')),
      recipient TEXT NOT NULL,
      workflow TEXT NOT NULL,
      subject TEXT,
      message_body TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'failed', 'skipped')) DEFAULT 'pending',
      service_response TEXT,
      error_details TEXT,
      attempts INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS processed_webhooks (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
    CREATE INDEX IF NOT EXISTS idx_appointments_email ON appointments(customer_email);
    CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(preferred_date);
    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(razorpay_order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON notifications(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
  `);

  // Migration helper: add calendar_event_id and approval_timestamp if table previously created without them
  const tableInfo = db.prepare(`PRAGMA table_info(appointments)`).all() as any[];
  const columnNames = tableInfo.map(c => c.name);
  if (!columnNames.includes('calendar_event_id')) {
    db.exec(`ALTER TABLE appointments ADD COLUMN calendar_event_id TEXT;`);
  }
  if (!columnNames.includes('approval_timestamp')) {
    db.exec(`ALTER TABLE appointments ADD COLUMN approval_timestamp TEXT;`);
  }

  // Migration helper: ensure notifications table allows 'skipped' status
  try {
    const tableSql = (db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'`).get() as any)?.sql || '';
    if (tableSql && !tableSql.includes('skipped')) {
      db.exec(`
        CREATE TABLE notifications_migrated (
          id TEXT PRIMARY KEY,
          appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
          channel TEXT NOT NULL CHECK(channel IN ('whatsapp', 'email')),
          recipient TEXT NOT NULL,
          workflow TEXT NOT NULL,
          subject TEXT,
          message_body TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'failed', 'skipped')) DEFAULT 'pending',
          service_response TEXT,
          error_details TEXT,
          attempts INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO notifications_migrated SELECT * FROM notifications;
        DROP TABLE notifications;
        ALTER TABLE notifications_migrated RENAME TO notifications;
        CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON notifications(appointment_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
      `);
      console.log('[Database] Migrated notifications table to support skipped status.');
    }
  } catch (migErr) {
    console.error('Migration error on notifications table:', migErr);
  }

  // Seed default admin if none exists
  const existingAdmin = db.prepare('SELECT id FROM admins LIMIT 1').get();
  if (!existingAdmin) {
    const defaultEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@bimadost.in';
    const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AdminPassword@2026';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO admins (id, username, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('adm_root', 'admin', defaultEmail, passwordHash, 'admin', now, now);

    console.log(`[Database] Seeded initial administrator: ${defaultEmail}`);
  }
}
