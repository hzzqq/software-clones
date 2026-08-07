import db from '../db';
import type { Room } from '../types';

interface RoomRow {
  id: number;
  name: string;
  created_at: string;
  message_count: number;
}

function rowToRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    messageCount: row.message_count,
  };
}

export function listRooms(): Room[] {
  const rows = db
    .prepare(
      `SELECT r.*, (SELECT COUNT(*) FROM messages m WHERE m.room_id = r.id) AS message_count
       FROM rooms r ORDER BY r.created_at DESC, r.id DESC`
    )
    .all() as RoomRow[];
  return rows.map(rowToRoom);
}

export function getRoom(id: number): Room | null {
  const row = db
    .prepare(
      `SELECT r.*, (SELECT COUNT(*) FROM messages m WHERE m.room_id = r.id) AS message_count
       FROM rooms r WHERE r.id = ?`
    )
    .get(id) as RoomRow | undefined;
  return row ? rowToRoom(row) : null;
}

export function createRoom(name: string): Room {
  const now = new Date().toISOString();
  const info = db.prepare('INSERT INTO rooms (name, created_at) VALUES (?, ?)').run(name, now);
  const id = Number(info.lastInsertRowid);
  return getRoom(id)!;
}
