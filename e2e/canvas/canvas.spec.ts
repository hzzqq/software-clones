/**
 * canvas 冒烟：应用挂载 + 后端健康；画布 CRUD、节点创建/更新/删除、
 * 连线创建/删除及对应负路径（404/400）的真实 API 端到端。
 */
import { test, request as requestModule, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('canvas');
const API = `http://localhost:${APP.serverPort}/api`;

test('canvas 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await requestModule.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('canvas 画布 CRUD 端到端', async ({ request }) => {
  const name = `e2e_canvas_${Date.now()}`;

  // 1) 创建画布
  const create = await request.post(`${API}/canvases`, { data: { name } });
  expect(create.status()).toBe(201);
  const canvas = (await create.json()).data as { id: number; name: string };
  expect(canvas.id).toBeGreaterThan(0);
  expect(canvas.name).toBe(name);

  // 2) 列表可见，详情返回 nodes/edges 空集合
  const list = await request.get(`${API}/canvases`);
  expect(list.status()).toBe(200);
  const canvases = (await list.json()).data as { id: number }[];
  expect(canvases.some((c) => c.id === canvas.id)).toBe(true);
  const detail = await request.get(`${API}/canvases/${canvas.id}`);
  expect(detail.status()).toBe(200);
  const full = (await detail.json()).data as { nodes: unknown[]; edges: unknown[] };
  expect(Array.isArray(full.nodes)).toBe(true);
  expect(Array.isArray(full.edges)).toBe(true);

  // 3) 重命名生效
  const renamed = `${name}_renamed`;
  const patch = await request.patch(`${API}/canvases/${canvas.id}`, { data: { name: renamed } });
  expect(patch.status()).toBe(200);
  expect(((await patch.json()).data as { name: string }).name).toBe(renamed);

  // 4) 不存在的画布 404
  const missing = await request.get(`${API}/canvases/99999999`);
  expect(missing.status()).toBe(404);

  // 5) 删除后再查 404
  const del = await request.delete(`${API}/canvases/${canvas.id}`);
  expect(del.status()).toBe(200);
  const gone = await request.get(`${API}/canvases/${canvas.id}`);
  expect(gone.status()).toBe(404);
});

test('canvas 节点与连线 端到端', async ({ request }) => {
  // 前置：建一块画布
  const createCanvas = await request.post(`${API}/canvases`, {
    data: { name: `e2e_canvas_${Date.now()}` },
  });
  expect(createCanvas.status()).toBe(201);
  const canvasId = ((await createCanvas.json()).data as { id: number }).id;

  // 1) 创建便签节点
  const content = `e2e_note_${Date.now()}`;
  const createNode = await request.post(`${API}/canvases/${canvasId}/nodes`, {
    data: { kind: 'note', x: 10, y: 20, w: 120, h: 80, content },
  });
  expect(createNode.status()).toBe(201);
  const nodeA = (await createNode.json()).data as { id: number; content: string };
  expect(nodeA.content).toBe(content);

  // 2) 非法 kind 被拒绝（400）
  const badKind = await request.post(`${API}/canvases/${canvasId}/nodes`, {
    data: { kind: 'video', x: 0, y: 0, w: 10, h: 10 },
  });
  expect(badKind.status()).toBe(400);

  // 3) 向不存在的画布添加节点 404
  const noCanvas = await request.post(`${API}/canvases/99999999/nodes`, {
    data: { kind: 'note', x: 0, y: 0, w: 10, h: 10 },
  });
  expect(noCanvas.status()).toBe(404);

  // 4) 再建一个节点并连线，画布详情应包含两个节点与一条连线
  const createNodeB = await request.post(`${API}/canvases/${canvasId}/nodes`, {
    data: { kind: 'note', x: 200, y: 20, w: 120, h: 80, content: 'e2e_node_b' },
  });
  expect(createNodeB.status()).toBe(201);
  const nodeB = (await createNodeB.json()).data as { id: number };
  const createEdge = await request.post(`${API}/canvases/${canvasId}/edges`, {
    data: { fromId: nodeA.id, toId: nodeB.id, fromSide: 'right', toSide: 'left' },
  });
  expect(createEdge.status()).toBe(201);
  const edge = (await createEdge.json()).data as { id: number };
  const detail = await request.get(`${API}/canvases/${canvasId}`);
  const full = (await detail.json()).data as {
    nodes: { id: number }[];
    edges: { id: number }[];
  };
  expect(full.nodes.some((n) => n.id === nodeA.id)).toBe(true);
  expect(full.nodes.some((n) => n.id === nodeB.id)).toBe(true);
  expect(full.edges.some((e) => e.id === edge.id)).toBe(true);

  // 5) 更新节点内容生效
  const updated = `e2e_note_updated_${Date.now()}`;
  const patch = await request.patch(`${API}/nodes/${nodeA.id}`, { data: { content: updated } });
  expect(patch.status()).toBe(200);
  expect(((await patch.json()).data as { content: string }).content).toBe(updated);

  // 6) 自连连线被拒绝（400）
  const selfEdge = await request.post(`${API}/canvases/${canvasId}/edges`, {
    data: { fromId: nodeA.id, toId: nodeA.id },
  });
  expect(selfEdge.status()).toBe(400);

  // 7) 删除连线与节点后详情不再包含
  const delEdge = await request.delete(`${API}/edges/${edge.id}`);
  expect(delEdge.status()).toBe(200);
  const delNode = await request.delete(`${API}/nodes/${nodeA.id}`);
  expect(delNode.status()).toBe(200);
  const after = await request.get(`${API}/canvases/${canvasId}`);
  const fullAfter = (await after.json()).data as {
    nodes: { id: number }[];
    edges: { id: number }[];
  };
  expect(fullAfter.nodes.some((n) => n.id === nodeA.id)).toBe(false);
  expect(fullAfter.edges.some((e) => e.id === edge.id)).toBe(false);

  // 清理画布
  await request.delete(`${API}/canvases/${canvasId}`);
});
