import db from '../db';
import type { Comment, CreateCommentInput } from '../types';

interface CommentRow {
  id: number;
  post_id: number;
  parent_id: number | null;
  author_name: string;
  body: string;
  likes: number;
  created_at: string;
  updated_at: string;
}

function rowToComment(r: CommentRow): Comment {
  return {
    id: r.id,
    postId: r.post_id,
    parentId: r.parent_id,
    authorName: r.author_name,
    body: r.body,
    likes: r.likes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listComments(postId: number): Comment[] {
  const rows = db
    .prepare(`SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC`)
    .all(postId) as CommentRow[];
  return rows.map(rowToComment);
}

export function getComment(id: number): Comment | null {
  const row = db.prepare(`SELECT * FROM comments WHERE id = ?`).get(id) as CommentRow | undefined;
  return row ? rowToComment(row) : null;
}

export function createComment(input: CreateCommentInput): Comment {
  const info = db
    .prepare(`INSERT INTO comments (post_id, parent_id, author_name, body) VALUES (?, ?, ?, ?)`)
    .run(input.postId, input.parentId ?? null, input.authorName?.trim() || '匿名', input.body.trim());
  return getComment(Number(info.lastInsertRowid))!;
}

export function deleteComment(id: number): boolean {
  const info = db.prepare(`DELETE FROM comments WHERE id = ?`).run(id);
  return info.changes > 0;
}

export function likeComment(id: number): Comment | null {
  db.prepare(`UPDATE comments SET likes = likes + 1 WHERE id = ?`).run(id);
  return getComment(id);
}
