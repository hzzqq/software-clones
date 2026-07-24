import { defineConfig } from '@playwright/test';

/**
 * 12 个克隆 App 的 E2E 冒烟套件骨架。
 *
 * 约定：
 * - 每个 App 一个 Playwright project，独立启动自身的 vite dev server（固定端口，避免冲突）。
 * - 每个 project 的 testDir 指向 e2e/<app>/，仅运行该 App 自己的 spec。
 * - spec 只做「应用成功挂载」级别冒烟：断言 React 已渲染且无 Vite 运行时错误覆盖层。
 *   具体交互用例可按需在 e2e/<app>/ 下继续补充。
 *
 * 注意：沙箱环境中 better-sqlite3 无法编译，dev server 实际起不来；本配置仅作为可在
 * 真实环境 / CI 中 `npm i && npx playwright install && npm run test:e2e` 运行的脚手架。
 */

export interface AppSpec {
  name: string;
  dir: string; // 相对仓库根的 vite 项目目录
  port: number;
}

export const APPS: AppSpec[] = [
  { name: 'markdown', dir: 'markdown/client', port: 5180 },
  { name: 'apiclient', dir: 'apiclient/client', port: 5181 },
  { name: 'tvtime', dir: 'tvtime/client', port: 5182 },
  { name: 'excalidraw', dir: 'excalidraw/client', port: 5183 },
  { name: 'photopea', dir: 'photopea/client', port: 5184 },
  { name: 'it-tools', dir: 'it-tools/client', port: 5185 },
  { name: 'kanban', dir: 'kanban/client', port: 5186 },
  { name: 'glance', dir: 'glance/client', port: 5187 },
  { name: 'kener', dir: 'kener/client', port: 5188 },
  { name: 'memos', dir: 'memos/client', port: 5189 },
  { name: 'lofi', dir: 'lofi/client', port: 5190 },
  { name: 'nonio', dir: 'nonio/client', port: 5191 },
];

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // 12 个 dev server 同时起开销大，串行更稳
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  projects: APPS.map((app) => ({
    name: app.name,
    testDir: `./e2e/${app.name}`,
    use: {
      baseURL: `http://localhost:${app.port}`,
    },
    webServer: {
      command: `npm --prefix ${app.dir} run dev -- --port ${app.port} --strictPort`,
      url: `http://localhost:${app.port}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  })),
});
