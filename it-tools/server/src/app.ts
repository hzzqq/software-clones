import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { favoritesRouter } from './routes/favorites';
import { historyRouter } from './routes/history';
import { settingsRouter } from './routes/settings';

export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

app.use('/api', healthRouter);
app.use('/api', favoritesRouter);
app.use('/api', historyRouter);
app.use('/api', settingsRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
