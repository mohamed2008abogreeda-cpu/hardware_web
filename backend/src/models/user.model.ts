import { getDatabase } from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'tech' | 'viewer';
  is_active: number;
  created_at: string;
}

export class UserModel {
  static async create(username: string, passwordPlain: string, name: string, role: string): Promise<number> {
    const db = getDatabase();
    const hash = await bcrypt.hash(passwordPlain, 10);
    const stmt = db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)');
    const info = stmt.run(username, hash, name, role);
    return info.lastInsertRowid as number;
  }

  static findByUsername(username: string): (User & { password_hash: string }) | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    return (row as User & { password_hash: string }) || null;
  }

  static findById(id: number): User | null {
    const db = getDatabase();
    const row = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?').get(id);
    return (row as User) || null;
  }

  static getAll(): User[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users ORDER BY id ASC').all();
    return rows as User[];
  }

  static updateRoleAndStatus(id: number, role: string, is_active: number): void {
    const db = getDatabase();
    db.prepare('UPDATE users SET role = ?, is_active = ? WHERE id = ?').run(role, is_active, id);
  }

  static delete(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}
