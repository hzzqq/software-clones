import db from '../db';
import type { Note, NoteItem, NoteItemInput, NoteLabel, NoteInput } from '../types';

interface NoteRow {
  id: number;
  title: string;
  body: string;
  color: string;
  is_pinned: number;
  is_archived: number;
  is_trash: number;
  created_at: string;
  updated_at: string;
  label_names: string | null;
  item_ids: string | null;
  item_texts: string | null;
  item_dones: string | null;
  item_orders: string | null;
}

/** 列表查询过滤条件。 */
export interface NoteFilter {
  /** 视图：`active`(默认,非归档非回收) | `archived` | `trash` */
  view?: 'active' | 'archived' | 'trash';
  label?: string;
  color?: string;
  q?: string;
}

function bool(value: number): boolean {
  return value === 1;
}

function rowToNote(row: NoteRow): Note {
  const labels: string[] = row.label_names ? row.label_names.split(',').filter(Boolean) : [];
  const items: NoteItem[] = [];
  if (row.item_ids) {
    const ids = row.item_ids.split(',');
    const texts = (row.item_texts ?? '').split('\u0001');
    const dones = (row.item_dones ?? '').split(',');
    const orders = (row.item_orders ?? '').split(',');
    ids.forEach((idStr, idx) => {
      items.push({
        id: Number(idStr),
        noteId: row.id,
        text: texts[idx] ?? '',
        done: bool(Number(dones[idx] ?? 0)),
        sortOrder: Number(orders[idx] ?? 0),
      });
    });
  }
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    color: row.color,
    isPinned: bool(row.is_pinned),
    isArchived: bool(row.is_archived),
    isTrash: bool(row.is_trash),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    labels,
    items,
  };
}

function labelSubquery(): string {
  return `(SELECT group_concat(nl.name) FROM note_label_map nlm JOIN note_labels nl ON nl.id = nlm.label_id WHERE nlm.note_id = n.id)`;
}

function itemFields(): string {
  return `(SELECT group_concat(id) FROM note_items WHERE note_id = n.id ORDER BY sort_order, id) AS item_ids,
          (SELECT group_concat(text, '\u0001') FROM note_items WHERE note_id = n.id ORDER BY sort_order, id) AS item_texts,
          (SELECT group_concat(done) FROM note_items WHERE note_id = n.id ORDER BY sort_order, id) AS item_dones,
          (SELECT group_concat(sort_order) FROM note_items WHERE note_id = n.id ORDER BY sort_order, id) AS item_orders`;
}

/** 转义 LIKE 通配符，配合 ESCAPE '\' 使用。 */
function likeEscape(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** 查询便签列表。置顶优先，其次按更新时间倒序。 */
export function listNotes(filter: NoteFilter = {}): Note[] {
  const view = filter.view ?? 'active';
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (view === 'active') {
    clauses.push('n.is_archived = 0 AND n.is_trash = 0');
  } else if (view === 'archived') {
    clauses.push('n.is_archived = 1 AND n.is_trash = 0');
  } else if (view === 'trash') {
    clauses.push('n.is_trash = 1');
  }

  if (filter.label) {
    clauses.push(
      `n.id IN (SELECT nlm.note_id FROM note_label_map nlm JOIN note_labels nl ON nl.id = nlm.label_id WHERE nl.name = ?)`,
    );
    params.push(filter.label);
  }
  if (filter.color) {
    clauses.push('n.color = ?');
    params.push(filter.color);
  }
  if (filter.q) {
    clauses.push(`(n.title LIKE ? ESCAPE '\\' OR n.body LIKE ? ESCAPE '\\')`);
    const term = `%${likeEscape(filter.q)}%`;
    params.push(term, term);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT n.*, ${labelSubquery()} AS label_names, ${itemFields()}
               FROM notes n ${where}
               ORDER BY n.is_pinned DESC, n.updated_at DESC, n.id DESC`;
  const rows = db.prepare(sql).all(...params) as NoteRow[];
  return rows.map(rowToNote);
}

/** 按 id 查询便签（含标签与 checklist）；不存在返回 null。 */
export function getNote(id: number): Note | null {
  const sql = `SELECT n.*, ${labelSubquery()} AS label_names, ${itemFields()}
               FROM notes n WHERE n.id = ?`;
  const row = db.prepare(sql).get(id) as NoteRow | undefined;
  return row ? rowToNote(row) : null;
}

function syncLabels(noteId: number, labelNames: string[]): void {
  const unique = Array.from(new Set(labelNames.map((l) => l.toLowerCase())));
  db.prepare('DELETE FROM note_label_map WHERE note_id = ?').run(noteId);
  const findLabel = db.prepare('SELECT id FROM note_labels WHERE name = ?');
  const insertLabel = db.prepare('INSERT OR IGNORE INTO note_labels (name) VALUES (?)');
  const link = db.prepare('INSERT OR IGNORE INTO note_label_map (note_id, label_id) VALUES (?, ?)');
  for (const name of unique) {
    insertLabel.run(name);
    const row = findLabel.get(name) as { id: number } | undefined;
    if (row) {
      link.run(noteId, row.id);
    }
  }
}

function syncItems(noteId: number, items: NoteItemInput[] | undefined): void {
  // 全量替换 checklist
  db.prepare('DELETE FROM note_items WHERE note_id = ?').run(noteId);
  if (!items || items.length === 0) {
    return;
  }
  const insert = db.prepare(
    'INSERT INTO note_items (note_id, text, done, sort_order) VALUES (?, ?, ?, ?)',
  );
  items.forEach((item, idx) => {
    insert.run(noteId, item.text, item.done ? 1 : 0, item.sortOrder ?? idx);
  });
}

function normalizeInput(input: NoteInput): NoteInput {
  // 缺省值处理，便于部分更新
  return {
    title: input.title ?? '',
    body: input.body ?? '',
    color: input.color ?? 'default',
    isPinned: input.isPinned,
    isArchived: input.isArchived,
    isTrash: input.isTrash,
    labels: input.labels,
    items: input.items,
  };
}

/** 创建便签（含标签与 checklist）。 */
export function createNote(input: NoteInput): Note {
  const data = normalizeInput(input);
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO notes (title, body, color, is_pinned, is_archived, is_trash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.title,
      data.body,
      data.color,
      data.isPinned ? 1 : 0,
      data.isArchived ? 1 : 0,
      data.isTrash ? 1 : 0,
      now,
      now,
    );
  const id = Number(info.lastInsertRowid);
  if (data.labels) syncLabels(id, data.labels);
  if (data.items) syncItems(id, data.items);
  return getNote(id)!;
}

/** 更新便签（部分字段）；标签或 checklist 传入时整体替换。 */
export function updateNote(id: number, input: NoteInput): Note | null {
  const existing = getNote(id);
  if (!existing) {
    return null;
  }
  const title = input.title ?? existing.title;
  const body = input.body ?? existing.body;
  const color = input.color ?? existing.color;
  const isPinned = input.isPinned ?? existing.isPinned;
  const isArchived = input.isArchived ?? existing.isArchived;
  const isTrash = input.isTrash ?? existing.isTrash;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE notes SET title = ?, body = ?, color = ?, is_pinned = ?, is_archived = ?, is_trash = ?, updated_at = ?
     WHERE id = ?`,
  ).run(title, body, color, isPinned ? 1 : 0, isArchived ? 1 : 0, isTrash ? 1 : 0, now, id);
  if (input.labels) syncLabels(id, input.labels);
  if (input.items) syncItems(id, input.items);
  return getNote(id);
}

/** 硬删除便签（级联删除标签映射与 checklist）。 */
export function deleteNote(id: number): boolean {
  const info = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return info.changes > 0;
}

/** 列出全部标签（含使用次数），按名称排序。 */
export function listLabels(): NoteLabel[] {
  const rows = db
    .prepare(
      `SELECT nl.id, nl.name, COUNT(nlm.note_id) AS count
       FROM note_labels nl
       LEFT JOIN note_label_map nlm ON nlm.label_id = nl.id
       GROUP BY nl.id
       HAVING COUNT(nlm.note_id) > 0
       ORDER BY nl.name COLLATE NOCASE ASC`,
    )
    .all() as Array<{ id: number; name: string; count: number }>;
  return rows.map((row) => ({ id: row.id, name: row.name, count: Number(row.count) }));
}

/** 列出所有被使用的颜色，供前端筛选。 */
export function listColors(): string[] {
  const rows = db
    .prepare(`SELECT DISTINCT color FROM notes WHERE is_trash = 0 ORDER BY color`)
    .all() as Array<{ color: string }>;
  return rows.map((r) => r.color);
}
