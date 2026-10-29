import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool, closeDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('========================================================================');
  console.log('[PostgreSQL Migration Runner] Starting schema migrations...');
  console.log('========================================================================');

  const pool = getPool();
  const client = await pool.connect();

  try {
    // 1. Create schema_migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Discover migration files
    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('[PostgreSQL Migration Runner] No migrations directory found.');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`[PostgreSQL Migration Runner] Discovered ${files.length} migration file(s).`);

    for (const file of files) {
      const alreadyApplied = await client.query(
        'SELECT name FROM schema_migrations WHERE name = $1',
        [file]
      );

      if (alreadyApplied.rows.length > 0) {
        console.log(`  ⏩ Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`  ▶ Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  ✅ Successfully applied migration: ${file}`);
      } catch (migErr) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Failed applying migration ${file}:`, migErr);
        throw migErr;
      }
    }

    console.log('========================================================================');
    console.log('[PostgreSQL Migration Runner] All schema migrations processed successfully.');
    console.log('========================================================================');
  } finally {
    client.release();
  }
}

// Run directly if invoked from CLI
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then(async () => {
      await closeDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[PostgreSQL Migration Runner] Migration fatal error:', err);
      await closeDatabase();
      process.exit(1);
    });
}
