import { expect, type Locator, type Page } from '@playwright/test';

/**
 * 「设置 + 使用说明」共享验收工具。
 *
 * 12 个 App 的该模块来自 _shared/settings-help/ 单一真源，DOM 结构完全同构，
 * 因此定位器与断言集中在这里，3 个 spec 只做「App 特化」部分，避免三份复制。
 *
 * 定位器策略说明：
 * - 悬浮入口是 MUI Fab，已带中文 aria-label（设置 / 使用说明），无需改源码加英文 label。
 * - 但**不能**只用 getByRole('button', { name: '设置' })：it-tools 侧栏里还有一个
 *   文案同为「设置」的 ListItemButton，会触发 strict mode 冲突。因此额外用
 *   .MuiFab-root 限定到悬浮入口本身。
 */

/** localStorage 中持久化的设置结构（与 _shared/settings-help/types.ts 对齐）。 */
export interface StoredSettings {
  version: number;
  themeMode: 'light' | 'dark' | 'system';
  fontScale: number;
  reduceMotion: boolean;
  extras: Record<string, unknown>;
}

/** 右下角「设置」悬浮按钮。 */
export function settingsFab(page: Page): Locator {
  return page.locator('button.MuiFab-root[aria-label="设置"]');
}

/** 右下角「使用说明」悬浮按钮。 */
export function helpFab(page: Page): Locator {
  return page.locator('button.MuiFab-root[aria-label="使用说明"]');
}

/** 当前打开的弹窗（MUI 同一时刻只挂载打开着的 Dialog）。 */
export function dialog(page: Page): Locator {
  return page.getByRole('dialog');
}

/** 点开设置面板并等待其可见，返回该 dialog 定位器。 */
export async function openSettingsDialog(page: Page): Promise<Locator> {
  await settingsFab(page).click();
  const d = dialog(page);
  await expect(d).toBeVisible();
  return d;
}

/** 点开使用说明并等待其可见，返回该 dialog 定位器。 */
export async function openHelpDialog(page: Page): Promise<Locator> {
  await helpFab(page).click();
  const d = dialog(page);
  await expect(d).toBeVisible();
  return d;
}

/** 关闭当前设置面板（点「完成」）。 */
export async function closeSettingsDialog(page: Page): Promise<void> {
  await dialog(page).getByRole('button', { name: '完成', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
}

/** 设置面板里的主题切换按钮（亮色 / 暗色 / 跟随系统）。 */
export function themeToggle(d: Locator, name: '亮色' | '暗色' | '跟随系统'): Locator {
  return d.getByRole('button', { name, exact: true });
}

/**
 * 读取某个 App 持久化的设置。
 *
 * 返回 null 表示键不存在 —— 这**也是**「恢复默认」的合法表现：
 * reset() 会直接 removeItem，下次 load() 回落到 DEFAULT_SETTINGS。
 */
export async function readStoredSettings(
  page: Page,
  appId: string,
): Promise<StoredSettings | null> {
  return page.evaluate((id: string) => {
    const text = window.localStorage.getItem(`app-settings:${id}`);
    if (!text) return null;
    try {
      return JSON.parse(text) as StoredSettings;
    } catch {
      return null;
    }
  }, appId);
}

/** 读取 body 的计算背景色，用于抽查主题是否真的换肤。 */
export function bodyBackgroundColor(page: Page): Promise<string> {
  return page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
}

/** 把 rgb()/rgba() 字符串粗略换算成亮度（0~255），用于判断「确实变暗」。 */
export function luminanceOf(color: string): number {
  const m = color.match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 3) return Number.NaN;
  const [r, g, b] = m.slice(0, 3).map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** body 上的弹窗标记 —— excalidraw / photopea 的画布快捷键守卫读的就是它。 */
export function modalOpenFlag(page: Page): Promise<string | null> {
  return page.evaluate(() => document.body.dataset.appModalOpen ?? null);
}

/**
 * 断言页面没有出现全局错误红条。
 *
 * 各 App 的 main.tsx 会在 unhandledrejection / error 时插入 #global-error-banner，
 * 因此它是「运行时是否炸了」的可靠信号。
 */
export async function expectNoErrorBanner(page: Page): Promise<void> {
  await expect(page.locator('#global-error-banner')).toHaveCount(0);
}

/**
 * 通用用例包：入口可见 / 打开设置 / 主题持久化 / 重置 / 打开帮助 / 全屏 best-effort。
 * 三个 spec 共用，App 差异只体现在 appId 与 help 文案上。
 */
export const SETTINGS_SECTION_TEXTS = ['主题', '字号', '全屏', '重置'] as const;
