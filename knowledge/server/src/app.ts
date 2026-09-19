import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { pagesRouter } from './routes/pages';
import { blocksRouter } from './routes/blocks';
import { searchRouter } from './routes/search';

/**
 * Builds and configures the Express application with shared middleware and
 * the `/api` route prefix for the Knowledge (双链大纲笔记) clone.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', pagesRouter);
app.use('/api', blocksRouter);
app.use('/api', searchRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

export default app;
