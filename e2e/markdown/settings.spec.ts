import { test, expect } from '@playwright/test';
import { findApp } from '../apps.config';
import { runCommonSettingsSuite } from '../settings-suite';
import { helpContent } from '../../markdown/client/src/help/helpContent';
import {
  openSettingsDialog,
  readStoredSettings,
  themeToggle,
} from '../settings-helpers';

const APP = findApp('markdown');

test.describe('markdown · 设置 + 使用说明', () => {
  runCommonSettingsSuite({
    appId: 'markdown',
    serverPort: APP.serverPort,
    helpAppName: helpContent.appName,
    helpSectionTitle: helpContent.sections[0].title,
    // 供主理人肉眼查暗色对比度。
    darkScreenshotPath: 'e2e/settings-dark-mode-markdown.png',
  });

  test('[markdown] 字号缩放同样落盘并作用于根字号', async ({ page }) => {
    await page.goto('/');
    const d = await openSettingsDialog(page);

    const slider = d.getByRole('slider', { name: '字号缩放' });
    await slider.focus();
    await page.keyboard.press('ArrowRight');

    await expect
      .poll(async () => (await readStoredSettings(page, 'markdown'))?.fontScale)
      .toBeGreaterThan(1);

    const rootFontSize = await page.evaluate(
      () => window.getComputedStyle(document.documentElement).fontSize,
    );
    expect(parseFloat(rootFontSize)).toBeGreaterThan(16);
  });

  test('[markdown] 跟随系统模式可选中并落盘', async ({ page }) => {
    await page.goto('/');
    const d = await openSettingsDialog(page);
    await themeToggle(d, '跟随系统').click();

    await expect
      .poll(async () => (await readStoredSettings(page, 'markdown'))?.themeMode)
      .toBe('system');
    await expect(themeToggle(d, '跟随系统')).toHaveAttribute('aria-pressed', 'true');
  });
});
