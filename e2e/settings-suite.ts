import { expect, request, test, type Page } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from './helpers';
import {
  bodyBackgroundColor,
  closeSettingsDialog,
  dialog,
  expectNoErrorBanner,
  helpFab,
  luminanceOf,
  openHelpDialog,
  openSettingsDialog,
  readStoredSettings,
  settingsFab,
  themeToggle,
  SETTINGS_SECTION_TEXTS,
} from './settings-helpers';

/**
 * 「设置 + 使用说明」通用验收套件。
 *
 * 该模块来自单一真源（_shared/settings-help/），12 个 App 的 DOM 完全同构，
 * 所以通用行为写一份、由各 spec 传入 App 差异（appId / 端口 / 帮助文案）复用，
 * 避免三份复制粘贴导致断言漂移。
 */
export interface SettingsSuiteOptions {
  /** localStorage 键里的 App 标识，如 'markdown'。 */
  appId: string;
  /** 该 App 的后端端口，用于健康检查。 */
  serverPort: number;
  /** 帮助弹窗里应出现的 App 名称（helpContent.appName）。 */
  helpAppName: string;
  /** 帮助弹窗里应出现的任一分组标题（helpContent.sections[].title）。 */
  helpSectionTitle: string;
  /** 若提供，则在暗色主题下截一张全页图到该路径。 */
  darkScreenshotPath?: string;
}

/** 打开首页并确认应用已挂载（每个用例的统一前置）。 */
async function gotoApp(page: Page): Promise<void> {
  await page.goto('/');
  await expectAppMounted(page);
}

/** 注册通用用例。 */
export function runCommonSettingsSuite(opts: SettingsSuiteOptions): void {
  const { appId, serverPort, helpAppName, helpSectionTitle, darkScreenshotPath } = opts;

  test(`[${appId}] 后端健康且应用挂载`, async ({ page }) => {
    await gotoApp(page);
    const ctx = await request.newContext();
    await expectServerHealthy(ctx, serverPort);
    await ctx.dispose();
  });

  test(`[${appId}] 用例1 右下角设置/帮助入口可见`, async ({ page }) => {
    await gotoApp(page);
    await expect(settingsFab(page)).toBeVisible();
    await expect(helpFab(page)).toBeVisible();
  });

  test(`[${appId}] 用例2 点击设置打开面板且含全部分区`, async ({ page }) => {
    await gotoApp(page);
    const d = await openSettingsDialog(page);
    for (const text of SETTINGS_SECTION_TEXTS) {
      await expect(d).toContainText(text);
    }
  });

  test(`[${appId}] 用例3 主题切换持久化且 reload 后仍生效`, async ({ page }) => {
    await gotoApp(page);

    const lightBg = await bodyBackgroundColor(page);

    const d = await openSettingsDialog(page);
    await themeToggle(d, '暗色').click();

    // 落盘
    await expect
      .poll(async () => (await readStoredSettings(page, appId))?.themeMode)
      .toBe('dark');

    // 页面确实变暗
    const darkBg = await bodyBackgroundColor(page);
    expect(darkBg).not.toBe(lightBg);
    expect(luminanceOf(darkBg)).toBeLessThan(luminanceOf(lightBg));
    expect(luminanceOf(darkBg)).toBeLessThan(96);

    if (darkScreenshotPath) {
      await closeSettingsDialog(page);
      await page.screenshot({ path: darkScreenshotPath, fullPage: true });
    }

    // reload 后仍是暗色
    await page.reload();
    await expectAppMounted(page);
    expect(luminanceOf(await bodyBackgroundColor(page))).toBeLessThan(96);

    const d2 = await openSettingsDialog(page);
    await expect(themeToggle(d2, '暗色')).toHaveAttribute('aria-pressed', 'true');
    await expect(themeToggle(d2, '亮色')).toHaveAttribute('aria-pressed', 'false');
  });

  test(`[${appId}] 用例4 重置恢复默认设置`, async ({ page }) => {
    await gotoApp(page);
    const d = await openSettingsDialog(page);

    await themeToggle(d, '暗色').click();
    await expect
      .poll(async () => (await readStoredSettings(page, appId))?.themeMode)
      .toBe('dark');

    await d.getByRole('button', { name: '重置', exact: true }).click();

    // reset() 走的是 removeItem：键被清掉（下次 load 回落默认）或写回 light，两者都算恢复默认。
    await expect
      .poll(async () => {
        const stored = await readStoredSettings(page, appId);
        return stored === null ? 'light' : stored.themeMode;
      })
      .toBe('light');

    // UI 与页面外观同步回默认
    await expect(themeToggle(d, '亮色')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('已恢复默认设置')).toBeVisible();
    expect(luminanceOf(await bodyBackgroundColor(page))).toBeGreaterThan(160);
  });

  test(`[${appId}] 用例5 点击问号打开使用说明`, async ({ page }) => {
    await gotoApp(page);
    const d = await openHelpDialog(page);
    await expect(d).toContainText(helpAppName);
    await expect(d).toContainText(helpSectionTitle);
  });

  test(`[${appId}] 用例6 全屏开关不崩溃（best-effort）`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await gotoApp(page);
    const d = await openSettingsDialog(page);

    const fullscreenSwitch = d
      .locator('label')
      .filter({ hasText: '全屏模式' })
      .locator('input[type="checkbox"]');
    await expect(fullscreenSwitch).toHaveCount(1);
    await fullscreenSwitch.click();

    // 两种结果都算通过：真进了全屏，或给出「不支持」提示。
    const entered = await page
      .waitForFunction(() => document.fullscreenElement !== null, undefined, { timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    const refused = await page
      .getByText('当前环境不支持全屏')
      .isVisible()
      .catch(() => false);

    expect(
      entered || refused,
      `全屏切换后既未进入全屏也未提示不支持（fullscreenElement=${String(entered)}）`,
    ).toBeTruthy();

    // 硬性要求：不能崩、不能弹全局错误红条、应用仍在。
    await expectNoErrorBanner(page);
    await expect(dialog(page)).toBeVisible();
    expect(pageErrors, `出现未捕获错误: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });
}
