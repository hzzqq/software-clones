import { app } from './app';
import { PORT } from './config';

app.listen(PORT, () => {
  console.log(`[it-tools server] listening on http://localhost:${PORT}`);
});
