import { app } from './app';
import { PORT } from './config';

app.listen(PORT, () => {
  console.log(`[vault server] listening on http://localhost:${PORT}`);
});
