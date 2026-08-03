import { defineConfig } from '@playwright/test';
import { findApp } from './e2e/apps.config';

/**
 * 「设置 + 使用说明」功能的**聚焦**验收配置。
 *
 * 与根 playwright.config.ts 的区别：
 * - 只拉起 3 个代表性 App 的前端（markdown / it-tools / excalidraw），
 *   而不是全部 12 个 —— 本轮验收只需要覆盖「通用 + 两个特殊点」。
 * - globalSetup / globalTeardown 直接复用现有实现（字符串路径，ESM 下不能用 require）。
 *   注意：现有 globalSetup 会拉起全部 12 个后端，这是既有基建行为，此处不做侵入式改造。
 *
 * 端口一律从 apps.ports.json（单一真源）经 findApp 读取，避免在此处再硬编码一份导致漂移。
 */

/** 本轮聚焦验收的 3 个 App。 */
const FOCUS_APPS = ['markdown', 'it-tools', 'excalidraw'].map(findApp);

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-settings' }],
  ],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  projects: FOCUS_APPS.map((app) => ({
    name: app.name,
    testDir: `./e2e/${app.name}`,
    use: {
      baseURL: `http://localhost:${app.clientPort}`,
    },
  })),
  webServer: FOCUS_APPS.map((app) => ({
    command: `npm --prefix ${app.clientDir} run dev -- --port ${app.clientPort} --strictPort`,
    url: `http://localhost:${app.clientPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      VITE_API_BASE: `http://localhost:${app.serverPort}/api`,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })),
});
