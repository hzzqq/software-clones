import { app } from './app';
import { PORT } from './config';

/**
 * Entry point. Binds the Express app to the configured port and logs readiness.
 */
app.listen(PORT, () => {
  console.log(`[shlink-server] listening on http://localhost:${PORT}`);
});
