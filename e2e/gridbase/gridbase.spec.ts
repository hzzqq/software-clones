/**
 * gridbase E2E 冒烟：应用挂载 + 后端健康；表格 CRUD/重命名，以及
 * 字段、行、单元格（PUT /api/cells）与网格视图的端到端。网格视图为
 * EAV 结构：rows[].cells 以 fieldId -> value 形式嵌入（JSON 键为字符串）。
 */
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('gridbase');
const API = `http://localhost:${APP.serverPort}/api`;

/** 信封内的表。 */
interface TableDto {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** 信封内的字段。 */
interface FieldDto {
  id: number;
  tableId: number;
  name: string;
  type: string;
  options: string[] | null;
  sortOrder: number;
}

/** 信封内的行。 */
interface RowDto {
  id: number;
  tableId: number;
}

/** 网格视图：表 + 字段定义 + 行（cells 为 fieldId 字符串键的取值映射）。 */
interface GridViewDto {
  table: TableDto;
  fields: FieldDto[];
  rows: Array<{ id: number; cells: Record<string, string | null> }>;
}

test('gridbase 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('gridbase 表格 CRUD 与重命名', async ({ request }) => {
  const name = `e2e_table_${Date.now()}`;

  // 1) 创建表 → 201
  const create = await request.post(`${API}/tables`, { data: { name } });
  expect(create.status()).toBe(201);
  const table = (await create.json()).data as TableDto;
  expect(table.id).toBeGreaterThan(0);
  expect(table.name).toBe(name);

  // 2) 列表 + 详情确认持久化
  const list = await request.get(`${API}/tables`);
  expect(list.status()).toBe(200);
  expect(
    ((await list.json()).data as TableDto[]).some((t) => t.id === table.id)
  ).toBe(true);
  const one = await request.get(`${API}/tables/${table.id}`);
  expect(one.status()).toBe(200);
  expect(((await one.json()).data as TableDto).name).toBe(name);

  // 3) 重命名 → 200
  const renamed = `${name}_renamed`;
  const patch = await request.patch(`${API}/tables/${table.id}`, { data: { name: renamed } });
  expect(patch.status()).toBe(200);
  expect(((await patch.json()).data as TableDto).name).toBe(renamed);

  // 4) 负路径：空白名称 → 400；不存在的表 → 404
  const invalid = await request.post(`${API}/tables`, { data: { name: '   ' } });
  expect(invalid.status()).toBe(400);
  const missing = await request.get(`${API}/tables/99999999`);
  expect(missing.status()).toBe(404);

  // 5) 删除 → 200 { id }，随后 404
  const del = await request.delete(`${API}/tables/${table.id}`);
  expect(del.status()).toBe(200);
  expect(((await del.json()).data as { id: number }).id).toBe(table.id);
  const gone = await request.get(`${API}/tables/${table.id}`);
  expect(gone.status()).toBe(404);
});

test('gridbase 字段/行/单元格与网格视图', async ({ request }) => {
  // 0) 建表
  const tableRes = await request.post(`${API}/tables`, {
    data: { name: `e2e_grid_${Date.now()}` },
  });
  expect(tableRes.status()).toBe(201);
  const table = (await tableRes.json()).data as TableDto;

  // 1) 添加文本字段 → 201；不支持的类型 → 400
  const fieldRes = await request.post(`${API}/tables/${table.id}/fields`, {
    data: { name: '名称', type: 'text' },
  });
  expect(fieldRes.status()).toBe(201);
  const field = (await fieldRes.json()).data as FieldDto;
  expect(field.tableId).toBe(table.id);
  expect(field.type).toBe('text');
  const badField = await request.post(`${API}/tables/${table.id}/fields`, {
    data: { name: '坏字段', type: 'color' },
  });
  expect(badField.status()).toBe(400);

  // 2) 添加空行 → 201
  const rowRes = await request.post(`${API}/tables/${table.id}/rows`, { data: {} });
  expect(rowRes.status()).toBe(201);
  const row = (await rowRes.json()).data as RowDto;
  expect(row.tableId).toBe(table.id);

  // 3) 写入单元格 → 200 回显 { rowId, fieldId, value }
  const cellValue = `e2e_cell_${Date.now()}`;
  const cellRes = await request.put(`${API}/cells`, {
    data: { rowId: row.id, fieldId: field.id, value: cellValue },
  });
  expect(cellRes.status()).toBe(200);
  expect(
    (await cellRes.json()).data as { rowId: number; fieldId: number; value: string | null }
  ).toMatchObject({ rowId: row.id, fieldId: field.id, value: cellValue });

  // 4) 网格视图确认字段定义与单元格值都持久化（cells 键为 fieldId 字符串）
  const gridRes = await request.get(`${API}/tables/${table.id}/rows`);
  expect(gridRes.status()).toBe(200);
  const grid = (await gridRes.json()).data as GridViewDto;
  expect(grid.table.id).toBe(table.id);
  expect(grid.fields.some((f) => f.id === field.id)).toBe(true);
  const gridRow = grid.rows.find((r) => r.id === row.id);
  expect(gridRow).toBeTruthy();
  expect(gridRow!.cells[String(field.id)]).toBe(cellValue);

  // 5) 负路径：给不存在的行写单元格 → 404
  const badCell = await request.put(`${API}/cells`, {
    data: { rowId: 99999999, fieldId: field.id, value: 'x' },
  });
  expect(badCell.status()).toBe(404);

  // 6) 删除行 / 字段 → 200 { id }；重复删行 → 404
  const delRow = await request.delete(`${API}/rows/${row.id}`);
  expect(delRow.status()).toBe(200);
  expect(((await delRow.json()).data as { id: number }).id).toBe(row.id);
  const delRowAgain = await request.delete(`${API}/rows/${row.id}`);
  expect(delRowAgain.status()).toBe(404);
  const delField = await request.delete(`${API}/fields/${field.id}`);
  expect(delField.status()).toBe(200);
  expect(((await delField.json()).data as { id: number }).id).toBe(field.id);
});
