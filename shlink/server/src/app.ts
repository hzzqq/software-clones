import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { linksRouter } from './routes/links';
import { redirectRouter } from './routes/redirect';

/**
 * Builds and configures the Express application with shared middleware.
 * API routes live under `/api`; the short-link redirect route `/r/:code`
 * is mounted at the root so pasted short URLs work directly.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

// Short-link redirect (root level, outside /api).
app.use('/', redirectRouter);

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', linksRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

export default app;
