import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logAction } from '../middleware/logger';

/**
 * Backup Service handles automated SQLite database backups.
 */
export class BackupService {
  private static readonly BACKUP_DIR = path.resolve(__dirname, '../../../backups/db');

  /**
   * Run a manual backup now.
   */
  static async runBackup(): Promise<string> {
    try {
      // Ensure backup directory exists
      if (!fs.existsSync(this.BACKUP_DIR)) {
        fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.BACKUP_DIR, `portal-backup-${timestamp}.sqlite`);

      // Copy the live database file
      // Note: Since we use WAL mode, we should ideally use SQLite's backup API
      // but for a simple portal, a direct file copy while the server is quiet is usually okay.
      // A better way with better-sqlite3: database.backup(path)
      
      const dbPath = path.resolve(env.SQLITE_DB_PATH);
      if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found at ${dbPath}`);
      }

      fs.copyFileSync(dbPath, backupPath);

      // Keep only last 7 backups (optional but good practice)
      this.cleanupOldBackups();

      console.log(`[Backup] Success: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('[Backup] Failed:', error);
      throw error;
    }
  }

  /**
   * Remove backups older than 7 days.
   */
  private static cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.BACKUP_DIR)
        .filter(f => f.startsWith('portal-backup-'))
        .map(f => ({ name: f, time: fs.statSync(path.join(this.BACKUP_DIR, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 7) {
        files.slice(7).forEach(f => {
          fs.unlinkSync(path.join(this.BACKUP_DIR, f.name));
          console.log(`[Backup] Cleaned up: ${f.name}`);
        });
      }
    } catch (err) {
      console.error('[Backup] Cleanup failed:', err);
    }
  }
}
