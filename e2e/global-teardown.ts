import { execSync } from 'child_process';
import { E2E_APPS } from './apps.config';

const SERVER_PORTS = E2E_APPS.map((a) => a.serverPort);

/**
 * 全局收尾：按端口找到并结束全部 12 个后端进程（含其 npm/tsx/node 子进程树）。
 *
 * 为什么不用 pkill / child.kill()：
 * - git bash 环境下 pkill 不可用，bash 的 kill 也杀不动原生 Windows PID；
 * - npm run dev 会派生 tsx → node 子进程，只杀父进程会留下孤儿占着端口。
 * 所以按「端口 → PID → taskkill /T 杀整棵树」来做，并在收尾后复查一次。
 */
function listeningPids(port: number): string[] {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pids = new Set<string>();
    for (const line of out.split('\n')) {
      // 形如：  TCP    0.0.0.0:4201    0.0.0.0:0    LISTENING    12345
      const m = line.match(new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`));
      if (m) pids.add(m[1]);
    }
    return [...pids];
  } catch {
    return []; // findstr 无匹配时 exit code 1
  }
}

function killTree(pid: string): void {
  try {
    execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
  } catch {
    /* 进程可能已退出 */
  }
}

export default async function globalTeardown(): Promise<void> {
  for (const port of SERVER_PORTS) {
    for (const pid of listeningPids(port)) killTree(pid);
  }

  // 复查一轮，兜住 taskkill 之后才刚起来的子进程
  await new Promise((r) => setTimeout(r, 800));
  const leftovers: number[] = [];
  for (const port of SERVER_PORTS) {
    const pids = listeningPids(port);
    if (pids.length > 0) {
      for (const pid of pids) killTree(pid);
      leftovers.push(port);
    }
  }
  if (leftovers.length > 0) {
    console.warn(`[teardown] 二次清理端口: ${leftovers.join(', ')}`);
  }
}
