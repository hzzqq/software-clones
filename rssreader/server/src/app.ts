import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { feedsRouter } from './routes/feeds';
import { itemsRouter } from './routes/items';

/**
 * Builds and configures the Express application with shared middleware.
 * API routes live under the shared `/api` prefix.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '5mb' }));

app.use('/api', healthRouter);
app.use('/api', feedsRouter);
app.use('/api', itemsRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

export default app;
