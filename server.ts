import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { app } from './server/app.js';
import { initDatabase } from './server/db.js';
import { isGoogleCalendarConfigured } from './server/services/calendar.js';
import { isWhatsAppConfigured } from './server/services/whatsapp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_Tt48hSDE3HvOU4';

export async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Only bind port when not running in Vercel serverless execution
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('========================================================================');
      console.log(`[Bima Dost] Server running on http://localhost:${PORT}`);
      console.log('[Bima Dost] Integration Configuration Validation:');
      console.log(`  • Database: PostgreSQL (${process.env.DATABASE_URL ? 'Connected to hosted PostgreSQL' : 'Local In-Memory Engine'})`);
      console.log(`  • Razorpay Payments: ${RAZORPAY_KEY_ID ? 'Configured (Key: ' + RAZORPAY_KEY_ID + ')' : 'Missing Key'}`);
      console.log(`  • Razorpay Webhook HMAC: ${process.env.RAZORPAY_WEBHOOK_SECRET ? 'Configured' : 'Missing Secret'}`);
      console.log(`  • Resend Email: ${process.env.RESEND_API_KEY ? 'Configured (' + (process.env.EMAIL_FROM || 'onboarding@resend.dev') + ')' : 'Missing RESEND_API_KEY'}`);
      console.log(`  • Google Calendar & Meet: ${isGoogleCalendarConfigured() ? 'Configured (' + (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'Service Account') + ')' : 'Not Configured'}`);
      console.log(`  • Gemini Multilingual AI: ${process.env.GEMINI_API_KEY ? 'Configured (gemini-3.1-flash-lite)' : 'Missing GEMINI_API_KEY'}`);
      console.log(`  • WhatsApp Cloud API: ${isWhatsAppConfigured() ? 'Configured' : 'Optional / Not Configured (Skipped Gracefully)'}`);
      console.log('========================================================================');
    });
  }
}

// Start server if executed directly (e.g. npm run dev or npm start)
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;
