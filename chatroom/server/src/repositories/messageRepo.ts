import db from '../db';
import type { Message } from '../types';

interface MessageRow {
  id: number;
  room_id: number;
  nickname: string;
  content: string;
  created_at: string;
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    roomId: row.room_id,
    nickname: row.nickname,
    content: row.content,
    createdAt: row.created_at,
  };
}

/** 房间历史消息（id 倒序取最近 limit 条，再正序返回）。 */
export function listMessages(roomId: number, limit: number): Message[] {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit) || 50));
  const rows = db
    .prepare(
      `SELECT * FROM (
         SELECT * FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT ?
       ) ORDER BY id ASC`
    )
    .all(roomId, safeLimit) as MessageRow[];
  return rows.map(rowToMessage);
}

export function createMessage(
  roomId: number,
  nickname: string,
  content: string
): Message {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      'INSERT INTO messages (room_id, nickname, content, created_at) VALUES (?, ?, ?, ?)'
    )
    .run(roomId, nickname, content, now);
  const id = Number(info.lastInsertRowid);
  return {
    id,
    roomId,
    nickname,
    content,
    createdAt: now,
  };
}

/** 裁剪房间消息到最近 max 条（超出即删除最旧的）。 */
export function trimRoomMessages(roomId: number, max: number): number {
  const safeMax = Math.max(1, Math.floor(max) || 500);
  const info = db
    .prepare(
      `DELETE FROM messages WHERE room_id = ? AND id NOT IN (
         SELECT id FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT ?
       )`
    )
    .run(roomId, roomId, safeMax);
  return info.changes;
}
