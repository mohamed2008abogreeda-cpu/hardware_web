import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from './env';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  // Ensure directory exists
  const dir = path.dirname(env.SQLITE_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(env.SQLITE_DB_PATH);

  // Enable WAL mode for concurrent read/write
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -20000'); // 20MB cache
  db.pragma('foreign_keys = ON');

  console.log(`[DB] SQLite connected: ${env.SQLITE_DB_PATH}`);
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] SQLite connection closed');
  }
}

export function runMigrations(): void {
  const database = getDatabase();
  const migrationsDir = path.resolve(__dirname, '../../database/migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('[DB] No migrations directory found');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      database.exec(sql);
      console.log(`[DB] Migration applied: ${file}`);
    } catch (err) {
      const error = err as Error;
      // Ignore 'already exists' errors for idempotent migrations
      if (!error.message.includes('already exists')) {
        console.error(`[DB] Migration failed: ${file}`, error.message);
        throw err;
      }
    }
  }
}
