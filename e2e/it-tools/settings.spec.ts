import { test, expect } from '@playwright/test';
import { findApp } from '../apps.config';
import { runCommonSettingsSuite } from '../settings-suite';
import { helpContent } from '../../it-tools/client/src/help/helpContent';
import { expectAppMounted } from '../helpers';
import { dialog, settingsFab, themeToggle } from '../settings-helpers';

const APP = findApp('it-tools');

test.describe('it-tools · 设置 + 使用说明', () => {
  runCommonSettingsSuite({
    appId: 'it-tools',
    serverPort: APP.serverPort,
    helpAppName: helpContent.appName,
    helpSectionTitle: helpContent.sections[0].title,
    darkScreenshotPath: 'e2e/settings-dark-mode-itools.png',
  });

  test('[it-tools] 专项 旧 /settings 路由重定向回首页，不再有独立设置页', async ({ page }) => {
    await page.goto('/settings');
    await expectAppMounted(page);

    // 路由已重定向：URL 不再停留在 /settings。
    await expect.poll(() => new URL(page.url()).pathname).not.toBe('/settings');

    // 没有渲染出任何「独立设置页」：此刻页面上不应存在设置面板以外的设置视图，
    // 且共享 dialog 未被自动打开。
    await expect(dialog(page)).toHaveCount(0);
    await expect(settingsFab(page)).toBeVisible();
  });

  test('[it-tools] 专项 AppBar 齿轮与悬浮入口打开的是同一个共享设置面板', async ({ page }) => {
    await page.goto('/');
    await expectAppMounted(page);

    // AppBar 上的齿轮（aria-label="settings"，与 Fab 的中文 label 区分开）。
    const appBarGear = page.getByRole('button', { name: 'settings', exact: true });
    await expect(appBarGear).toHaveCount(1);

    await appBarGear.click();
    const fromAppBar = dialog(page);
    await expect(fromAppBar).toBeVisible();
    // 同一时刻只有一个设置面板 —— 不存在「第二套设置入口/第二个面板」。
    await expect(dialog(page)).toHaveCount(1);
    await expect(fromAppBar).toContainText('主题');
    await expect(fromAppBar).toContainText('开发者工具箱');

    // 在这个面板里切暗色，关闭后用悬浮入口再开，状态应当延续（证明是同一份 state）。
    await themeToggle(fromAppBar, '暗色').click();
    await fromAppBar.getByRole('button', { name: '完成', exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);

    await settingsFab(page).click();
    const fromFab = dialog(page);
    await expect(fromFab).toBeVisible();
    await expect(dialog(page)).toHaveCount(1);
    await expect(themeToggle(fromFab, '暗色')).toHaveAttribute('aria-pressed', 'true');
  });
});
