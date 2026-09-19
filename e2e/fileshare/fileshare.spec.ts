/**
 * fileshare 冒烟：应用挂载 + 后端健康；文件上传（octet-stream + X-File-Name）、
 * 列表/短码元信息、下载计数、删除后短码失效的真实 API 端到端。
 */
import { test, request as requestModule, expect, type APIRequestContext } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('fileshare');
const API = `http://localhost:${APP.serverPort}/api`;

interface SharedFileData {
  id: number;
  code: string;
  originalName: string;
  size: number;
  mimeType: string;
  downloadCount: number;
}

/** 按服务端 express.raw 契约上传文件：octet-stream 原始二进制 + X-File-Name 头。 */
async function uploadFile(
  requestCtx: APIRequestContext,
  fileName: string,
  content: Buffer
): Promise<SharedFileData> {
  const res = await requestCtx.post(`${API}/files`, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(fileName),
    },
    data: content,
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data as SharedFileData;
}

test('fileshare 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await requestModule.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('fileshare 上传/查询/下载计数/删除 端到端', async ({ request }) => {
  const fileName = `e2e_fileshare_${Date.now()}.txt`;
  const payload = Buffer.from(`e2e fileshare payload ${Date.now()}`);

  // 1) 原始二进制上传，返回文件记录（downloadCount 从 0 开始）
  const file = await uploadFile(request, fileName, payload);
  expect(file.id).toBeGreaterThan(0);
  expect(file.code).toBeTruthy();
  expect(file.originalName).toBe(fileName);
  expect(file.size).toBe(payload.length);
  expect(file.mimeType).toBe('application/octet-stream');
  expect(file.downloadCount).toBe(0);

  // 2) 列表与短码元信息均可见
  const list = await request.get(`${API}/files`);
  expect(list.status()).toBe(200);
  const files = (await list.json()).data as { id: number }[];
  expect(files.some((f) => f.id === file.id)).toBe(true);
  const meta = await request.get(`${API}/files/${file.code}/meta`);
  expect(meta.status()).toBe(200);
  expect(((await meta.json()).data as { code: string }).code).toBe(file.code);

  // 3) 下载内容与上传一致，且计数 +1
  const download = await request.get(`${API}/files/${file.code}/download`);
  expect(download.status()).toBe(200);
  expect(await download.text()).toBe(payload.toString('utf-8'));
  const afterDownload = await request.get(`${API}/files/${file.code}/meta`);
  expect(((await afterDownload.json()).data as SharedFileData).downloadCount).toBe(1);

  // 4) 未知短码 404
  const missing = await request.get(`${API}/files/e2e_no_such/meta`);
  expect(missing.status()).toBe(404);

  // 5) 删除后短码失效
  const del = await request.delete(`${API}/files/${file.id}`);
  expect(del.status()).toBe(200);
  const gone = await request.get(`${API}/files/${file.code}/meta`);
  expect(gone.status()).toBe(404);
});

test('fileshare 空文件上传被拒绝 端到端', async ({ request }) => {
  // 空 body 上传应返回 400
  const empty = await request.post(`${API}/files`, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(`e2e_fileshare_empty_${Date.now()}.txt`),
    },
    data: Buffer.alloc(0),
  });
  expect(empty.status()).toBe(400);
});
