/**
 * gallery 冒烟：应用挂载 + 后端健康；资源（图片）上传/查询/删除、
 * 相册 CRUD 与资源入册、标签创建/打标/移除的真实 API 端到端。
 */
import { test, request as requestModule, expect, type APIRequestContext } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('gallery');
const API = `http://localhost:${APP.serverPort}/api`;

/** 1x1 透明 PNG，作为上传测试的最小合法图片。 */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

interface AssetData {
  id: number;
  code: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/** 按服务端 express.raw 契约上传图片：octet-stream 原始二进制 + X-File-Name 头。 */
async function uploadAsset(
  requestCtx: APIRequestContext,
  fileName: string
): Promise<AssetData> {
  const res = await requestCtx.post(`${API}/assets`, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(fileName),
      'X-Mime-Type': 'image/png',
    },
    data: TINY_PNG,
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data as AssetData;
}

test('gallery 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await requestModule.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('gallery 资源上传/查询/删除 端到端', async ({ request }) => {
  const fileName = `e2e_gallery_${Date.now()}.png`;

  // 1) 原始二进制上传，返回资源元信息
  const asset = await uploadAsset(request, fileName);
  expect(asset.id).toBeGreaterThan(0);
  expect(asset.originalName).toBe(fileName);
  expect(asset.mimeType).toBe('image/png');
  expect(asset.size).toBe(TINY_PNG.length);
  expect(asset.code).toBeTruthy();

  // 2) 详情确认持久化
  const detail = await request.get(`${API}/assets/${asset.id}`);
  expect(detail.status()).toBe(200);
  expect(((await detail.json()).data as { id: number }).id).toBe(asset.id);

  // 3) 列表可见
  const list = await request.get(`${API}/assets`);
  expect(list.status()).toBe(200);
  const assets = (await list.json()).data as { id: number }[];
  expect(assets.some((a) => a.id === asset.id)).toBe(true);

  // 4) 不存在的资源 404
  const missing = await request.get(`${API}/assets/99999999`);
  expect(missing.status()).toBe(404);

  // 5) 删除后再查 404
  const del = await request.delete(`${API}/assets/${asset.id}`);
  expect(del.status()).toBe(200);
  const gone = await request.get(`${API}/assets/${asset.id}`);
  expect(gone.status()).toBe(404);
});

test('gallery 相册 CRUD 与资源入册 端到端', async ({ request }) => {
  const name = `e2e_album_${Date.now()}`;

  // 1) 创建相册
  const create = await request.post(`${API}/albums`, { data: { name } });
  expect(create.status()).toBe(201);
  const album = (await create.json()).data as { id: number; name: string };
  expect(album.id).toBeGreaterThan(0);
  expect(album.name).toBe(name);

  // 2) 空名称被拒绝
  const bad = await request.post(`${API}/albums`, { data: { name: '   ' } });
  expect(bad.status()).toBe(400);

  // 3) 上传图片并加入相册
  const asset = await uploadAsset(request, `e2e_gallery_${Date.now()}.png`);
  const add = await request.post(`${API}/albums/${album.id}/assets`, {
    data: { assetId: asset.id },
  });
  expect(add.status()).toBe(200);
  expect(((await add.json()).data as { added: number }).added).toBe(1);

  // 4) 相册资源列表包含该图片
  const inAlbum = await request.get(`${API}/albums/${album.id}/assets`);
  expect(inAlbum.status()).toBe(200);
  const assets = (await inAlbum.json()).data as { id: number }[];
  expect(assets.some((a) => a.id === asset.id)).toBe(true);

  // 5) 重命名生效
  const renamed = `${name}_renamed`;
  const patch = await request.patch(`${API}/albums/${album.id}`, { data: { name: renamed } });
  expect(patch.status()).toBe(200);
  expect(((await patch.json()).data as { name: string }).name).toBe(renamed);

  // 6) 移出资源、删除相册后 404
  const remove = await request.delete(`${API}/albums/${album.id}/assets/${asset.id}`);
  expect(remove.status()).toBe(200);
  await request.delete(`${API}/assets/${asset.id}`);
  const del = await request.delete(`${API}/albums/${album.id}`);
  expect(del.status()).toBe(200);
  const gone = await request.get(`${API}/albums/${album.id}`);
  expect(gone.status()).toBe(404);
});

test('gallery 标签创建/打标/移除 端到端', async ({ request }) => {
  const tagName = `e2e_tag_${Date.now()}`;
  const asset = await uploadAsset(request, `e2e_gallery_${Date.now()}.png`);

  // 1) 创建全局标签
  const create = await request.post(`${API}/tags`, { data: { name: tagName } });
  expect(create.status()).toBe(201);
  const tag = (await create.json()).data as { id: number; name: string };
  expect(tag.name).toBe(tagName);

  // 2) 给资源打标签（路由实际返回 200 而非 201）
  const tagged = await request.post(`${API}/assets/${asset.id}/tags`, { data: { name: tagName } });
  expect(tagged.status()).toBe(200);
  expect(((await tagged.json()).data as { name: string }).name).toBe(tagName);

  // 3) 资源标签列表包含该标签
  const list = await request.get(`${API}/assets/${asset.id}/tags`);
  expect(list.status()).toBe(200);
  const tags = (await list.json()).data as { id: number; name: string }[];
  expect(tags.some((t) => t.id === tag.id)).toBe(true);

  // 4) 对不存在的资源打标签 404
  const missing = await request.post(`${API}/assets/99999999/tags`, { data: { name: tagName } });
  expect(missing.status()).toBe(404);

  // 5) 移除标签后不再出现
  const untag = await request.delete(`${API}/assets/${asset.id}/tags/${tag.id}`);
  expect(untag.status()).toBe(200);
  const after = await request.get(`${API}/assets/${asset.id}/tags`);
  const remain = (await after.json()).data as { id: number }[];
  expect(remain.some((t) => t.id === tag.id)).toBe(false);

  // 清理测试资源
  await request.delete(`${API}/assets/${asset.id}`);
});
