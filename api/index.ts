import { app } from '../server/app.js';
import { initDatabase } from '../server/db.js';

let isReady = false;

// Initialize database schema lazily on serverless warm-up
async function ensureDb() {
  if (!isReady) {
    try {
      await initDatabase();
      isReady = true;
    } catch (err) {
      console.error('[Vercel Serverless] Failed to initialize database connection:', err);
    }
  }
}

// Ensure database initialization runs on first incoming request
app.use(async (_req, _res, next) => {
  if (!isReady) {
    await ensureDb();
  }
  next();
});

export default app;
