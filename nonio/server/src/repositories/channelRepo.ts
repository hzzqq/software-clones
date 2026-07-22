import db from '../db';
import type { Channel, CreateChannelInput, UpdateChannelInput } from '../types';

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `ch-${Date.now()}`;
}

interface ChannelRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  post_count: number;
  created_at: string;
  updated_at: string;
}

function rowToChannel(r: ChannelRow): Channel {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    postCount: r.post_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listChannels(): Channel[] {
  const rows = db
    .prepare(`SELECT c.*, (SELECT COUNT(*) FROM posts p WHERE p.channel_id = c.id) AS post_count
              FROM channels c ORDER BY c.id ASC`)
    .all() as ChannelRow[];
  return rows.map(rowToChannel);
}

export function getChannel(id: number): Channel | null {
  const row = db
    .prepare(`SELECT c.*, (SELECT COUNT(*) FROM posts p WHERE p.channel_id = c.id) AS post_count
              FROM channels c WHERE c.id = ?`)
    .get(id) as ChannelRow | undefined;
  return row ? rowToChannel(row) : null;
}

export function createChannel(input: CreateChannelInput): Channel {
  const slug = slugify(input.name);
  const info = db
    .prepare(`INSERT INTO channels (name, slug, description) VALUES (?, ?, ?)`)
    .run(input.name.trim(), slug, input.description?.trim() ?? '');
  return getChannel(Number(info.lastInsertRowid))!;
}

export function updateChannel(id: number, input: UpdateChannelInput): Channel | null {
  const existing = getChannel(id);
  if (!existing) return null;
  const name = input.name?.trim() ?? existing.name;
  const description = input.description?.trim() ?? existing.description;
  const slug = input.name ? slugify(input.name) : existing.slug;
  db.prepare(`UPDATE channels SET name = ?, slug = ?, description = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
    .run(name, slug, description, id);
  return getChannel(id);
}

export function deleteChannel(id: number): boolean {
  const info = db.prepare(`DELETE FROM channels WHERE id = ?`).run(id);
  return info.changes > 0;
}
