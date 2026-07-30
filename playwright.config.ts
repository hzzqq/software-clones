import { defineConfig } from '@playwright/test';
import { E2E_APPS } from './e2e/apps.config';

/**
 * 12 个克隆 App 的真实 E2E 套件。
 *
 * 关键变化（相比早期仅冒烟前端）：
 * - globalSetup 按端口分配拉起 **全部 12 个后端**（better-sqlite3 v13 自带预编译二进制，现已可运行），
 *   并等待每个 /api/health 就绪。
 * - 顶层 webServer 数组拉起 12 个前端，通过 `VITE_API_BASE` 把每个前端指向对应后端端口，
 *   因此测试真正走「前端 → 后端 → SQLite」全链路。
 * - spec 既断言应用挂载，也断言后端健康；memos 额外验证「注册/登录/建笔记/前端可见」端到端。
 *
 * 注意：webServer 只能配在顶层（TestProject 上没有这个字段），
 * 写进 projects 里会被静默忽略，前端根本不会被拉起来 —— 踩过这个坑。
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // 12 个 dev server 同时起开销大，串行更稳
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  projects: E2E_APPS.map((app) => ({
    name: app.name,
    testDir: `./e2e/${app.name}`,
    use: {
      baseURL: `http://localhost:${app.clientPort}`,
    },
  })),
  webServer: E2E_APPS.map((app) => ({
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
