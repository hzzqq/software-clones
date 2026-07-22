import db from '../db';
import type { HistoryItem, HttpMethod } from '../types';

interface HistoryRow {
  id: number;
  method: string;
  url: string;
  status: number;
  status_text: string;
  time_ms: number;
  created_at: string;
}

function rowToHistory(r: HistoryRow): HistoryItem {
  return {
    id: r.id,
    method: r.method as HttpMethod,
    url: r.url,
    status: r.status,
    statusText: r.status_text,
    timeMs: r.time_ms,
    createdAt: r.created_at,
  };
}

export function listHistory(limit = 50): HistoryItem[] {
  const rows = db
    .prepare(`SELECT * FROM history ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as HistoryRow[];
  return rows.map(rowToHistory);
}

export function addHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>): void {
  db.prepare(
    `INSERT INTO history (method, url, status, status_text, time_ms) VALUES (?, ?, ?, ?, ?)`,
  ).run(item.method, item.url, item.status, item.statusText, item.timeMs);
}

export function clearHistory(): void {
  db.prepare(`DELETE FROM history`).run();
}

export function pruneHistory(keep = 200): void {
  db.prepare(`DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY created_at DESC LIMIT ?)`).run(
    keep,
  );
}
