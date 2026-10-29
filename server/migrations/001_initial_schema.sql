-- Bima Dost PostgreSQL Initial Schema Migration
-- Migration: 001_initial_schema.sql

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
