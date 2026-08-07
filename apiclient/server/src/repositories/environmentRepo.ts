import db from '../db';
import type { Environment, CreateEnvironmentInput, UpdateEnvironmentInput } from '../types';

interface EnvironmentRow {
  id: number;
  name: string;
  variables: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/** 宽松解析变量 JSON：损坏数据退化为空对象，避免整个列表接口 500。 */
function parseVariables(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!k.trim()) continue;
      out[k] = v == null ? '' : String(v);
    }
    return out;
  } catch {
    return {};
  }
}

function rowToEnvironment(r: EnvironmentRow): Environment {
  return {
    id: r.id,
    name: r.name,
    variables: parseVariables(r.variables),
    active: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** 列出全部环境，激活项优先，其余按名称升序。 */
export function listEnvironments(): Environment[] {
  const rows = db
    .prepare(`SELECT * FROM environments ORDER BY is_active DESC, name COLLATE NOCASE ASC, id ASC`)
    .all() as EnvironmentRow[];
  return rows.map(rowToEnvironment);
}

export function getEnvironment(id: number): Environment | null {
  if (!Number.isInteger(id)) return null;
  const row = db.prepare(`SELECT * FROM environments WHERE id = ?`).get(id) as EnvironmentRow | undefined;
  return row ? rowToEnvironment(row) : null;
}

/** 返回当前激活环境；没有则返回 null。 */
export function getActiveEnvironment(): Environment | null {
  const row = db.prepare(`SELECT * FROM environments WHERE is_active = 1 LIMIT 1`).get() as
    | EnvironmentRow
    | undefined;
  return row ? rowToEnvironment(row) : null;
}

export function createEnvironment(input: CreateEnvironmentInput): Environment {
  const name = (input.name ?? '').trim() || '未命名环境';
  const variables = JSON.stringify(input.variables ?? {});
  const info = db
    .prepare(`INSERT INTO environments (name, variables, is_active) VALUES (?, ?, 0)`)
    .run(name, variables);
  const id = Number(info.lastInsertRowid);
  if (input.active === true) activateEnvironment(id);
  return getEnvironment(id)!;
}

export function updateEnvironment(id: number, input: UpdateEnvironmentInput): Environment | null {
  const existing = getEnvironment(id);
  if (!existing) return null;
  const name = input.name !== undefined ? input.name.trim() || existing.name : existing.name;
  const variables = input.variables !== undefined ? input.variables : existing.variables;
  db.prepare(
    `UPDATE environments SET name = ?, variables = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
  ).run(name, JSON.stringify(variables), id);
  return getEnvironment(id);
}

/**
 * 激活指定环境（互斥）：先把所有环境置为未激活，再激活目标。
 * 用事务保证不会出现「零个或多个激活环境」的中间态。
 */
export function activateEnvironment(id: number): Environment | null {
  const existing = getEnvironment(id);
  if (!existing) return null;
  const run = db.transaction((targetId: number) => {
    db.prepare(`UPDATE environments SET is_active = 0 WHERE is_active = 1`).run();
    db.prepare(
      `UPDATE environments SET is_active = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
    ).run(targetId);
  });
  run(id);
  return getEnvironment(id);
}

/** 取消所有环境的激活状态（对应「不使用环境」）。 */
export function deactivateAll(): void {
  db.prepare(`UPDATE environments SET is_active = 0 WHERE is_active = 1`).run();
}

export function deleteEnvironment(id: number): boolean {
  const info = db.prepare(`DELETE FROM environments WHERE id = ?`).run(id);
  return info.changes > 0;
}
