import { app } from './app';
import { PORT } from './config';

app.listen(PORT, () => {
  console.log(`[habit server] listening on http://localhost:${PORT}`);
});
