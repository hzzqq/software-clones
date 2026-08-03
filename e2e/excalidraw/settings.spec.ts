import { test, expect } from '@playwright/test';
import { findApp } from '../apps.config';
import { runCommonSettingsSuite } from '../settings-suite';
import { helpContent } from '../../excalidraw/client/src/help/helpContent';
import { expectAppMounted } from '../helpers';
import {
  closeSettingsDialog,
  dialog,
  expectNoErrorBanner,
  modalOpenFlag,
  openSettingsDialog,
} from '../settings-helpers';

const APP = findApp('excalidraw');

test.describe('excalidraw · 设置 + 使用说明', () => {
  runCommonSettingsSuite({
    appId: 'excalidraw',
    serverPort: APP.serverPort,
    helpAppName: helpContent.appName,
    helpSectionTitle: helpContent.sections[0].title,
  });

  test('[excalidraw] 专项 弹窗打开时画布快捷键守卫生效（best-effort）', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    await expectAppMounted(page);

    // 前置：无弹窗时不应有标记。
    expect(await modalOpenFlag(page)).toBeNull();

    const d = await openSettingsDialog(page);

    // 守卫读的正是这个标记 —— 运行时确认其条件成立。
    await expect.poll(() => modalOpenFlag(page)).toBe('1');

    // 在弹窗内敲键：画布的 window keydown 监听会收到事件，但守卫应让其直接 return。
    await page.keyboard.press('v');
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Delete');

    // 断言：不崩溃、无全局错误红条、弹窗仍在、画布仍在。
    await expect(d).toBeVisible();
    await expectNoErrorBanner(page);
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(pageErrors, `出现未捕获错误: ${pageErrors.join(' | ')}`).toHaveLength(0);

    // 关闭后标记应被清除，快捷键恢复。
    await closeSettingsDialog(page);
    await expect.poll(() => modalOpenFlag(page)).toBeNull();
    await expect(dialog(page)).toHaveCount(0);
    await expectNoErrorBanner(page);
  });
});
