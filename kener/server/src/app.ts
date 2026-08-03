import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { servicesRouter } from './routes/services';
import { incidentsRouter } from './routes/incidents';
import { statusRouter } from './routes/status';
import { startProbeScheduler } from './services/scheduler';

/**
 * Builds and configures the Express application with shared middleware and
 * the `/api` route prefix for the Kener status page clone.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', servicesRouter);
app.use('/api', incidentsRouter);
app.use('/api', statusRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

// Begin periodic probing of all services (no-op if already running).
startProbeScheduler();

export default app;
