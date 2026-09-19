import { app } from './app';
import { PORT } from './config';
import { seedFmRootIfEmpty } from './lib/fsPath';

// 首次运行确保虚拟根目录存在并写入示例文件，便于直接体验。
seedFmRootIfEmpty();

/**
 * Entry point. Binds the Express app to the configured port and logs readiness.
 */
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
