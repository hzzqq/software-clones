import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { tickersRouter } from './routes/tickers';
import { quotesRouter } from './routes/quotes';
import { watchlistsRouter } from './routes/watchlists';

/**
 * Builds and configures the Express application with shared middleware and
 * the `/api` route prefix for the Finance terminal clone.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders());
app.use(express.json({ limit: '2mb' }));

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', tickersRouter);
app.use('/api', quotesRouter);
app.use('/api', watchlistsRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

export default app;
