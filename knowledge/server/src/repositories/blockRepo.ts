import db from '../db';
import type { Block, BlockNode } from '../types';

interface BlockRow {
  id: number;
  page_id: number;
  parent_id: number | null;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function rowToBlock(r: BlockRow): Block {
  return {
    id: r.id,
    pageId: r.page_id,
    parentId: r.parent_id,
    content: r.content,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** 列出某页面下全部块（扁平，按 sort_order / id 升序）。 */
export function listBlocksFlat(pageId: number): Block[] {
  return (
    db
      .prepare(
        'SELECT id, page_id, parent_id, content, sort_order, created_at, updated_at FROM blocks WHERE page_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(pageId) as BlockRow[]
  ).map(rowToBlock);
}

/** 按 id 查询块；不存在返回 null。 */
export function getBlock(id: number): Block | null {
  const r = db
    .prepare(
      'SELECT id, page_id, parent_id, content, sort_order, created_at, updated_at FROM blocks WHERE id = ?',
    )
    .get(id) as BlockRow | undefined;
  return r ? rowToBlock(r) : null;
}

interface CreateBlockInput {
  pageId: number;
  parentId?: number | null;
  content?: string;
  sortOrder?: number;
}

/** 创建块。 */
export function createBlock(input: CreateBlockInput): Block {
  const now = new Date().toISOString();
  const content = input.content ?? '';
  const parentId = input.parentId ?? null;
  const sortOrder = input.sortOrder ?? 0;
  const info = db
    .prepare(
      'INSERT INTO blocks (page_id, parent_id, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(input.pageId, parentId, content, sortOrder, now, now);
  return getBlock(Number(info.lastInsertRowid))!;
}

interface UpdateBlockInput {
  content?: string;
  parentId?: number | null;
  sortOrder?: number;
}

/** 更新块（部分字段）；同步刷新所属页面的 updated_at。 */
export function updateBlock(id: number, input: UpdateBlockInput): Block | null {
  const existing = getBlock(id);
  if (!existing) {
    return null;
  }
  const content = input.content ?? existing.content;
  const parentId = input.parentId !== undefined ? input.parentId : existing.parentId;
  const sortOrder = input.sortOrder ?? existing.sortOrder;
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE blocks SET content = ?, parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ?',
  ).run(content, parentId, sortOrder, now, id);
  db.prepare('UPDATE pages SET updated_at = ? WHERE id = ?').run(now, existing.pageId);
  return getBlock(id);
}

/** 删除块（ON DELETE CASCADE 自动清理子块与引用）。 */
export function deleteBlock(id: number): boolean {
  const existing = getBlock(id);
  if (!existing) {
    return false;
  }
  const now = new Date().toISOString();
  db.prepare('DELETE FROM blocks WHERE id = ?').run(id);
  db.prepare('UPDATE pages SET updated_at = ? WHERE id = ?').run(now, existing.pageId);
  return true;
}

/** 把扁平块列表构造成嵌套树（按 sort_order 排序）。 */
export function buildTree(pageId: number): BlockNode[] {
  const flat = listBlocksFlat(pageId);
  const map = new Map<number, BlockNode>();
  flat.forEach((b) => map.set(b.id, { ...b, children: [] }));

  const roots: BlockNode[] = [];
  flat.forEach((b) => {
    const node = map.get(b.id)!;
    if (b.parentId != null && map.has(b.parentId)) {
      map.get(b.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/** 按块内容关键词搜索，返回所在页面信息。 */
export function searchBlocks(
  q: string,
): Array<{ id: number; content: string; pageId: number; pageTitle: string }> {
  const term = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  return db
    .prepare(
      `SELECT b.id AS id, b.content AS content, b.page_id AS pageId, p.title AS pageTitle
       FROM blocks b JOIN pages p ON p.id = b.page_id
       WHERE b.content LIKE ? ESCAPE '\\'
       ORDER BY b.updated_at DESC, b.id DESC LIMIT 50`,
    )
    .all(term) as Array<{ id: number; content: string; pageId: number; pageTitle: string }>;
}
