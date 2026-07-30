import db from '../db';

export interface UserRow {
  id: number;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: string;
}

export interface PublicUser {
  id: number;
  email: string;
  displayName: string;
}

export function createUser(email: string, displayName: string, passwordHash: string): PublicUser {
  const now = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO users (email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(email, displayName, passwordHash, now);
  const id = Number(info.lastInsertRowid);
  return { id, email, displayName };
}

export function getUserByEmail(email: string): UserRow | null {
  return (
    (db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined) ?? null
  );
}

export function getUserById(id: number): PublicUser | null {
  const row = db
    .prepare('SELECT id, email, display_name FROM users WHERE id = ?')
    .get(id) as { id: number; email: string; display_name: string } | undefined;
  if (!row) return null;
  return { id: row.id, email: row.email, displayName: row.display_name };
}
