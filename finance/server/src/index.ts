import { app } from './app';
import { PORT } from './config';
import { ensureSeed } from './seed';

// 首次启动写入种子数据（离线行情快照），保证终端始终可用。
ensureSeed();

/**
 * Entry point. Binds the Express app to the configured port and logs readiness.
 */
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
