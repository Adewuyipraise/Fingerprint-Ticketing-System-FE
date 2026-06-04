import fs from 'fs';
import path from 'path';
import pool from '../src/db.js';

export async function runMigrations() {
  try {
    console.log('Starting migrations...');

    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS internal;

      CREATE TABLE IF NOT EXISTS internal.schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`SELECT pg_advisory_lock(99999)`);

    const migrationsPath = path.join(
      process.cwd(),
      'database',
      'migrations'
    );

    if (!fs.existsSync(migrationsPath)) {
      throw new Error(
        `Migration folder not found: ${migrationsPath}`
      );
    }

    const files = fs
      .readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const existing = await pool.query(
        `SELECT 1
         FROM internal.schema_migrations
         WHERE filename=$1`,
        [file]
      );

      if (existing.rows.length) {
        console.log(`Skipping: ${file}`);
        continue;
      }

      const start = Date.now();

      console.log(`Running: ${file}`);

      const sql = fs.readFileSync(
        path.join(migrationsPath, file),
        'utf8'
      );

      await pool.query('BEGIN');

      try {
        await pool.query(sql);

        await pool.query(
          `INSERT INTO internal.schema_migrations(filename)
           VALUES($1)`,
          [file]
        );

        await pool.query('COMMIT');

        console.log(
          `Completed ${file} in ${Date.now() - start}ms`
        );
      } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
      }
    }

    console.log('All migrations completed.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.query(`SELECT pg_advisory_unlock(99999)`);
    await pool.end();
  }
}

runMigrations();