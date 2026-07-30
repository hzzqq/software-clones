import db from '../db';
import crypto from 'crypto';

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    now,
  );
  return token;
}

export function getSession(token: string): number | null {
  const row = db
    .prepare('SELECT user_id FROM sessions WHERE token = ?')
    .get(token) as { user_id: number } | undefined;
  return row ? row.user_id : null;
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
