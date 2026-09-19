/**
 * knowledge E2E 冒烟：应用挂载 + 后端健康；页面 CRUD 与重名冲突，块的
 * 父子层级（大纲树）、块搜索与删除级联的端到端。
 * 注意：GET /api/search 会被 pagesRouter 的同名路由遮蔽（blocks 恒为空数组），
 * 块搜索统一走未被遮蔽的 GET /api/search/blocks。
 */
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('knowledge');
const API = `http://localhost:${APP.serverPort}/api`;

/** 信封内的页面。 */
interface PageDto {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** 信封内的块。 */
interface BlockDto {
  id: number;
  pageId: number;
  parentId: number | null;
  content: string;
  sortOrder: number;
}

/** 大纲树节点：块 + children。 */
interface BlockNodeDto extends BlockDto {
  children: BlockNodeDto[];
}

/** 页面详情：页面 + 大纲树。 */
interface PageDetailDto {
  page: PageDto;
  tree: BlockNodeDto[];
}

/** 块搜索命中项。 */
interface BlockSearchHitDto {
  id: number;
  content: string;
  pageId: number;
  pageTitle: string;
}

test('knowledge 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('knowledge 页面 CRUD 与重名冲突', async ({ request }) => {
  const title = `e2e_page_${Date.now()}`;

  // 1) 创建页面 → 201
  const create = await request.post(`${API}/pages`, { data: { title } });
  expect(create.status()).toBe(201);
  const page = (await create.json()).data as PageDto;
  expect(page.id).toBeGreaterThan(0);
  expect(page.title).toBe(title);

  // 2) 列表 + 详情确认持久化（详情含大纲树）
  const list = await request.get(`${API}/pages`);
  expect(list.status()).toBe(200);
  expect(
    ((await list.json()).data as PageDto[]).some((p) => p.id === page.id)
  ).toBe(true);
  const detail = await request.get(`${API}/pages/${page.id}`);
  expect(detail.status()).toBe(200);
  const d = (await detail.json()).data as PageDetailDto;
  expect(d.page.id).toBe(page.id);
  expect(Array.isArray(d.tree)).toBe(true);

  // 3) 重名 → 409；空白标题 → 400
  const dup = await request.post(`${API}/pages`, { data: { title } });
  expect(dup.status()).toBe(409);
  const invalid = await request.post(`${API}/pages`, { data: { title: '   ' } });
  expect(invalid.status()).toBe(400);

  // 4) 重命名 → 200
  const renamed = `${title}_renamed`;
  const patch = await request.patch(`${API}/pages/${page.id}`, { data: { title: renamed } });
  expect(patch.status()).toBe(200);
  expect(((await patch.json()).data as PageDto).title).toBe(renamed);

  // 5) 删除 → 200 { id }，随后 404
  const del = await request.delete(`${API}/pages/${page.id}`);
  expect(del.status()).toBe(200);
  expect(((await del.json()).data as { id: number }).id).toBe(page.id);
  const gone = await request.get(`${API}/pages/${page.id}`);
  expect(gone.status()).toBe(404);
});

test('knowledge 块层级、块搜索与删除级联', async ({ request }) => {
  const stamp = Date.now();

  // 0) 建页面
  const pageRes = await request.post(`${API}/pages`, {
    data: { title: `e2e_blocks_page_${stamp}` },
  });
  expect(pageRes.status()).toBe(201);
  const page = (await pageRes.json()).data as PageDto;

  // 1) 父块 + 子块 → 201；子块 parentId 指向父块，父块 parentId 为 null
  const parentRes = await request.post(`${API}/blocks`, {
    data: { pageId: page.id, content: `e2e 父块 ${stamp}` },
  });
  expect(parentRes.status()).toBe(201);
  const parent = (await parentRes.json()).data as BlockDto;
  expect(parent.pageId).toBe(page.id);
  expect(parent.parentId).toBeNull();

  const childRes = await request.post(`${API}/blocks`, {
    data: { pageId: page.id, parentId: parent.id, content: `e2e 子块 ${stamp}` },
  });
  expect(childRes.status()).toBe(201);
  const child = (await childRes.json()).data as BlockDto;
  expect(child.parentId).toBe(parent.id);

  // 2) 页面详情的树结构体现层级：父块为根节点，子块挂在其 children 下
  const detailRes = await request.get(`${API}/pages/${page.id}`);
  expect(detailRes.status()).toBe(200);
  const tree = ((await detailRes.json()).data as PageDetailDto).tree;
  const root = tree.find((n) => n.id === parent.id);
  expect(root).toBeTruthy();
  expect(root!.children.some((c) => c.id === child.id)).toBe(true);

  // 3) 块搜索（/api/search/blocks）按内容命中子块
  const searchRes = await request.get(
    `${API}/search/blocks?q=${encodeURIComponent(`子块 ${stamp}`)}`
  );
  expect(searchRes.status()).toBe(200);
  const hits = (await searchRes.json()).data as BlockSearchHitDto[];
  expect(hits.some((h) => h.id === child.id)).toBe(true);

  // 4) 更新块内容 → 200
  const updatedContent = `e2e 子块已更新 ${stamp}`;
  const patch = await request.patch(`${API}/blocks/${child.id}`, {
    data: { content: updatedContent },
  });
  expect(patch.status()).toBe(200);
  expect(((await patch.json()).data as BlockDto).content).toBe(updatedContent);

  // 5) 负路径：非法 pageId → 400；不存在的块 → 404
  const badBlock = await request.post(`${API}/blocks`, { data: { pageId: 0, content: 'x' } });
  expect(badBlock.status()).toBe(400);
  const missing = await request.get(`${API}/blocks/99999999`);
  expect(missing.status()).toBe(404);

  // 6) 删除子块 → 200 + 404；删除页面级联删父块；页面本身 404
  const delChild = await request.delete(`${API}/blocks/${child.id}`);
  expect(delChild.status()).toBe(200);
  expect(((await delChild.json()).data as { id: number }).id).toBe(child.id);
  const childGone = await request.get(`${API}/blocks/${child.id}`);
  expect(childGone.status()).toBe(404);
  const delPage = await request.delete(`${API}/pages/${page.id}`);
  expect(delPage.status()).toBe(200);
  const parentGone = await request.get(`${API}/blocks/${parent.id}`);
  expect(parentGone.status()).toBe(404);
  const pageGone = await request.get(`${API}/pages/${page.id}`);
  expect(pageGone.status()).toBe(404);
});
