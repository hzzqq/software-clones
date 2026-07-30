import { expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * 共享冒烟断言：应用已成功挂载且无 Vite 运行时错误覆盖层。
 * 各 App 的 spec 统一复用，避免重复逻辑。
 */
export async function expectAppMounted(page: Page): Promise<void> {
  // React 已挂载：#root 下至少有一个子节点
  await expect(page.locator('#root *')).not.toHaveCount(0);
  // 无 Vite 开发服务器运行时错误覆盖层
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
}

/**
 * 共享断言：对应端口的后端真实存活（/api/health 返回 code=0）。
 * 这是「端到端」的关键——证明前端所依赖的后端确实在运行。
 */
export async function expectServerHealthy(
  request: APIRequestContext,
  serverPort: number,
): Promise<void> {
  const res = await request.get(`http://localhost:${serverPort}/api/health`);
  if (res.status() !== 200) {
    throw new Error(`后端 ${serverPort} 返回 HTTP ${res.status()}`);
  }
  const body = (await res.json()) as { code: number };
  if (body.code !== 0) {
    throw new Error(`后端 ${serverPort} 不健康: ${JSON.stringify(body)}`);
  }
}
