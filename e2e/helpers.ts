import { expect, type Page } from '@playwright/test';

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
