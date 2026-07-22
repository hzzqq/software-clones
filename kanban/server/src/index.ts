import { app } from './app';
import { PORT } from './config';

app.listen(PORT, () => {
  console.log(`[kanban server] listening on http://localhost:${PORT}`);
});
