import { getDatabase } from '../config/database';

export class SettingsModel {
  static get(key: string): string | null {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  static getBoolean(key: string, defaultValue: boolean = false): boolean {
    const val = this.get(key);
    if (!val) return defaultValue;
    return val === 'true' || val === '1';
  }

  static getNumber(key: string, defaultValue: number = 0): number {
    const val = this.get(key);
    if (!val) return defaultValue;
    return Number(val) || defaultValue;
  }

  static set(key: string, value: string): void {
    const db = getDatabase();
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
  }

  static getAll(): Record<string, string> {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }
}
