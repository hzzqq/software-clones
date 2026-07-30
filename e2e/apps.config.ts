import ports from '../apps.ports.json' with { type: 'json' };

export interface E2EApp {
  name: string;
  serverDir: string;
  clientDir: string;
  serverPort: number;
  clientPort: number;
}

/**
 * 12 个克隆 App 的端口分配，读自根目录 apps.ports.json（单一真源，
 * 与 scripts/start-all.mjs、scripts/start-app.mjs、scripts/check-backends.mjs 共用）。
 *
 * - serverPort 互不冲突，避免默认 4101 被多个 app 抢占导致 EADDRINUSE。
 * - globalSetup 会按 serverPort 拉起后端；顶层 webServer 按 clientPort 拉起前端，
 *   并通过 VITE_API_BASE 把前端指到对应的后端端口，实现真正的端到端。
 */
export const E2E_APPS: E2EApp[] = ports.apps.map((a) => ({
  name: a.name,
  serverDir: `${a.name}/server`,
  clientDir: `${a.name}/client`,
  serverPort: a.serverPort,
  clientPort: a.clientPort,
}));

export function findApp(name: string): E2EApp {
  const app = E2E_APPS.find((a) => a.name === name);
  if (!app) throw new Error(`unknown e2e app: ${name}`);
  return app;
}
