import db from '../db';
import type { Post, CreatePostInput, UpdatePostInput } from '../types';

interface PostRow {
  id: number;
  channel_id: number;
  channel_name: string;
  title: string;
  body: string;
  author_name: string;
  tags: string;
  likes: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

function rowToPost(r: PostRow): Post {
  let tags: string[] = [];
  try {
    tags = JSON.parse(r.tags || '[]');
  } catch {
    tags = [];
  }
  return {
    id: r.id,
    channelId: r.channel_id,
    channelName: r.channel_name,
    title: r.title,
    body: r.body,
    authorName: r.author_name,
    tags,
    likes: r.likes,
    commentCount: r.comment_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listPosts(opts: { channelId?: number; tag?: string; q?: string } = {}): Post[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.channelId) {
    where.push('p.channel_id = ?');
    params.push(opts.channelId);
  }
  if (opts.tag) {
    where.push('p.tags LIKE ?');
    params.push(`%${opts.tag}%`);
  }
  if (opts.q) {
    where.push('(p.title LIKE ? OR p.body LIKE ?)');
    params.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT p.*, c.name AS channel_name,
                (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count
              FROM posts p JOIN channels c ON c.id = p.channel_id
              ${whereSql}
              ORDER BY p.created_at DESC`)
    .all(...params) as PostRow[];
  return rows.map(rowToPost);
}

export function getPost(id: number): Post | null {
  const row = db
    .prepare(`SELECT p.*, c.name AS channel_name,
                (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count
              FROM posts p JOIN channels c ON c.id = p.channel_id
              WHERE p.id = ?`)
    .get(id) as PostRow | undefined;
  return row ? rowToPost(row) : null;
}

export function createPost(input: CreatePostInput): Post {
  const tags = JSON.stringify(input.tags ?? []);
  const info = db
    .prepare(`INSERT INTO posts (channel_id, title, body, author_name, tags) VALUES (?, ?, ?, ?, ?)`)
    .run(input.channelId, input.title.trim(), input.body ?? '', input.authorName?.trim() || '匿名', tags);
  return getPost(Number(info.lastInsertRowid))!;
}

export function updatePost(id: number, input: UpdatePostInput): Post | null {
  const existing = getPost(id);
  if (!existing) return null;
  const title = input.title?.trim() ?? existing.title;
  const body = input.body ?? existing.body;
  const tags = input.tags ? JSON.stringify(input.tags) : JSON.stringify(existing.tags);
  db.prepare(`UPDATE posts SET title = ?, body = ?, tags = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
    .run(title, body, tags, id);
  return getPost(id);
}

export function deletePost(id: number): boolean {
  const info = db.prepare(`DELETE FROM posts WHERE id = ?`).run(id);
  return info.changes > 0;
}

export function likePost(id: number): Post | null {
  db.prepare(`UPDATE posts SET likes = likes + 1 WHERE id = ?`).run(id);
  return getPost(id);
}
