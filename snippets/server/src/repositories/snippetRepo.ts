import db from '../db';
import type { Snippet, SnippetInput, Tag } from '../types';

interface SnippetRow {
  id: number;
  title: string;
  language: string;
  code: string;
  created_at: string;
  updated_at: string;
  tag_names: string | null;
}

/** 列表查询过滤条件。 */
export interface SnippetFilter {
  language?: string;
  tag?: string;
  /** 匹配标题或代码内容。 */
  q?: string;
}

function rowToSnippet(row: SnippetRow): Snippet {
  return {
    id: row.id,
    title: row.title,
    language: row.language,
    code: row.code,
    tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function tagSubquery(): string {
  return `(SELECT group_concat(t.name) FROM snippet_tags st JOIN tags t ON t.id = st.tag_id WHERE st.snippet_id = s.id)`;
}

/** 转义 LIKE 通配符，配合 ESCAPE '\' 使用。 */
function likeEscape(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** 查询片段列表，支持按语言 / 标签 / 关键词过滤，按最近创建排序。 */
export function listSnippets(filter: SnippetFilter = {}): Snippet[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.language) {
    clauses.push('s.language = ?');
    params.push(filter.language);
  }
  if (filter.tag) {
    clauses.push(
      `s.id IN (SELECT st.snippet_id FROM snippet_tags st JOIN tags t ON t.id = st.tag_id WHERE t.name = ?)`,
    );
    params.push(filter.tag);
  }
  if (filter.q) {
    clauses.push(`(s.title LIKE ? ESCAPE '\\' OR s.code LIKE ? ESCAPE '\\')`);
    const term = `%${likeEscape(filter.q)}%`;
    params.push(term, term);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT s.*, ${tagSubquery()} AS tag_names FROM snippets s ${where} ORDER BY s.created_at DESC, s.id DESC`;
  const rows = db.prepare(sql).all(...params) as SnippetRow[];
  return rows.map(rowToSnippet);
}

/** 按 id 查询片段；不存在返回 null。 */
export function getSnippet(id: number): Snippet | null {
  const row = db
    .prepare(`SELECT s.*, ${tagSubquery()} AS tag_names FROM snippets s WHERE s.id = ?`)
    .get(id) as SnippetRow | undefined;
  return row ? rowToSnippet(row) : null;
}

/** 创建片段并同步标签。 */
export function createSnippet(input: SnippetInput): Snippet {
  const now = new Date().toISOString();
  const info = db
    .prepare(`INSERT INTO snippets (title, language, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
    .run(input.title, input.language, input.code, now, now);
  const id = Number(info.lastInsertRowid);
  syncTags(id, input.tags);
  return getSnippet(id)!;
}

/** 更新片段（部分字段）；标签传入时整体替换。 */
export function updateSnippet(
  id: number,
  input: Partial<SnippetInput>,
): Snippet | null {
  const existing = getSnippet(id);
  if (!existing) {
    return null;
  }
  const title = input.title ?? existing.title;
  const language = input.language ?? existing.language;
  const code = input.code ?? existing.code;
  const now = new Date().toISOString();
  db.prepare(`UPDATE snippets SET title = ?, language = ?, code = ?, updated_at = ? WHERE id = ?`).run(
    title,
    language,
    code,
    now,
    id,
  );
  if (input.tags) {
    syncTags(id, input.tags);
  }
  return getSnippet(id);
}

/** 删除片段，并清理其标签关联，保证标签计数可正确回落。 */
export function deleteSnippet(id: number): boolean {
  const info = db.prepare('DELETE FROM snippets WHERE id = ?').run(id);
  if (info.changes > 0) {
    db.prepare('DELETE FROM snippet_tags WHERE snippet_id = ?').run(id);
  }
  return info.changes > 0;
}

/** 全量替换片段的标签集合（不存在则创建）。 */
export function syncTags(snippetId: number, tagNames: string[]): void {
  const unique = Array.from(new Set(tagNames.map((t) => t.toLowerCase())));
  db.prepare('DELETE FROM snippet_tags WHERE snippet_id = ?').run(snippetId);

  const findTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const link = db.prepare('INSERT OR IGNORE INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)');

  for (const name of unique) {
    insertTag.run(name);
    const row = findTag.get(name) as { id: number } | undefined;
    if (row) {
      link.run(snippetId, row.id);
    }
  }
}

/** 列出全部标签（含使用次数），排除已无关联片段的标签，按名称排序。 */
export function listTags(): Tag[] {
  const rows = db
    .prepare(
      `SELECT t.id, t.name, COUNT(st.snippet_id) AS count
       FROM tags t
       LEFT JOIN snippet_tags st ON st.tag_id = t.id
       GROUP BY t.id
       HAVING COUNT(st.snippet_id) > 0
       ORDER BY t.name COLLATE NOCASE ASC`,
    )
    .all() as Array<{ id: number; name: string; count: number }>;
  return rows.map((row) => ({ id: row.id, name: row.name, count: Number(row.count) }));
}
