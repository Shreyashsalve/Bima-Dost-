import pg from 'pg';
import bcrypt from 'bcryptjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Pool, types } = pg;

// Parse PostgreSQL NUMERIC/DECIMAL as float instead of string to match existing application contracts
types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));

let globalPool: pg.Pool | null = null;
let isInMemory = false;
let memDbInstance: any = null;

export function getPool(): pg.Pool {
  if (globalPool) {
    return globalPool;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim() !== '') {
    const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
    const sslConfig = isLocalhost ? false : { rejectUnauthorized: false };

    globalPool = new Pool({
      connectionString: databaseUrl,
      ssl: sslConfig,
      max: process.env.PG_POOL_MAX ? parseInt(process.env.PG_POOL_MAX, 10) : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    globalPool.on('error', (err) => {
      console.error('[PostgreSQL Pool] Unexpected error on idle client:', err);
    });

    return globalPool;
  }

  // Fallback for local testing or environments where DATABASE_URL is not yet configured
  console.warn('[Database] DATABASE_URL is not set. Initializing in-memory PostgreSQL engine for local execution.');
  try {
    const { newDb } = require('pg-mem');
    memDbInstance = newDb();
    const pgAdapter = memDbInstance.adapters.createPg();
    globalPool = new pgAdapter.Pool();
    isInMemory = true;
    return globalPool!;
  } catch (err: any) {
    throw new Error('DATABASE_URL environment variable is required to connect to PostgreSQL: ' + err.message);
  }
}

export const pool = {
  query: <T extends pg.QueryResultRow = any>(text: string, params: any[] = []) => getPool().query<T>(text, params),
};

export async function query<T extends pg.QueryResultRow = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  const p = getPool();
  const res = await p.query<T>(text, params);
  return {
    rows: res.rows,
    rowCount: res.rowCount ?? res.rows.length,
  };
}

export async function queryOne<T extends pg.QueryResultRow = any>(text: string, params: any[] = []): Promise<T | null> {
  const res = await query<T>(text, params);
  return res.rows.length > 0 ? res.rows[0] : null;
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const p = getPool();
  let memBackup: any = null;
  if (isInMemory && memDbInstance) {
    memBackup = memDbInstance.backup();
  }
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    if (memBackup) {
      memBackup.restore();
    }
    throw error;
  } finally {
    client.release();
  }
}

export const DDL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS admins (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    docket_number VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    preferred_date VARCHAR(50) NOT NULL,
    preferred_time VARCHAR(50) NOT NULL,
    insurance_concern TEXT NOT NULL,
    insurance_company VARCHAR(255),
    preferred_language VARCHAR(50) NOT NULL DEFAULT 'English',
    fee NUMERIC(10, 2) NOT NULL DEFAULT 422.88,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 76.12,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 499.00,
    payment_status VARCHAR(50) NOT NULL CHECK(payment_status IN ('pending', 'verified', 'failed', 'refunded')) DEFAULT 'pending',
    status VARCHAR(50) NOT NULL CHECK(status IN (
      'awaiting_payment',
      'payment_verified_awaiting_approval',
      'approved',
      'rejected',
      'completed',
      'cancelled_refunded'
    )) DEFAULT 'awaiting_payment',
    google_meet_url TEXT,
    calendar_event_id TEXT,
    approval_timestamp VARCHAR(50),
    rejection_reason TEXT,
    admin_notes TEXT,
    notification_status VARCHAR(100) NOT NULL DEFAULT 'pending',
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    appointment_id VARCHAR(64) NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    razorpay_signature TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL CHECK(status IN ('created', 'captured', 'failed', 'refunded')) DEFAULT 'created',
    method VARCHAR(50),
    error_description TEXT,
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    appointment_id VARCHAR(64) NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK(channel IN ('whatsapp', 'email')),
    recipient VARCHAR(255) NOT NULL,
    workflow VARCHAR(100) NOT NULL,
    subject TEXT,
    message_body TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK(status IN ('pending', 'sent', 'failed', 'skipped')) DEFAULT 'pending',
    service_response TEXT,
    error_details TEXT,
    attempts INTEGER NOT NULL DEFAULT 1,
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS processed_webhooks (
    id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    created_at VARCHAR(50) NOT NULL
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
`;

let hasInitialized = false;

export async function initDatabase(): Promise<void> {
  if (hasInitialized && !isInMemory) {
    return;
  }

  const p = getPool();
  await p.query(DDL_SCHEMA);

  // Check if admin table is empty
  const adminCheck = await p.query('SELECT id FROM admins LIMIT 1');
  if (adminCheck.rows.length === 0) {
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL;
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

    if (adminEmail && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const now = new Date().toISOString();
      await p.query(
        `INSERT INTO admins (id, username, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        ['adm_root', 'admin', adminEmail.toLowerCase().trim(), passwordHash, 'admin', now, now]
      );
      console.log(`[Database] Initialized administrator from environment credentials: ${adminEmail}`);
    } else if (process.env.NODE_ENV !== 'production' || isInMemory) {
      // Safe fallback credentials strictly for local testing/development environments
      const defaultEmail = 'admin@bimadost.in';
      const defaultPassword = 'AdminPassword@2026';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      const now = new Date().toISOString();
      await p.query(
        `INSERT INTO admins (id, username, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        ['adm_root', 'admin', defaultEmail, passwordHash, 'admin', now, now]
      );
      console.log(`[Database] Seeded initial administrator for development/test: ${defaultEmail}`);
    } else {
      console.warn('[Database] Production Notice: No admin exists and ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD not set.');
    }
  }

  hasInitialized = true;
}

export async function closeDatabase(): Promise<void> {
  if (globalPool) {
    await globalPool.end();
    globalPool = null;
    hasInitialized = false;
  }
}
