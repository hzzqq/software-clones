import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { stationsRouter } from './routes/stations';
import { seedIfEmpty } from './repositories/stationRepo';

/**
 * Builds and configures the Express application with shared middleware and
 * the `/api` route prefix for the Lofi.cafe lo-fi radio clone.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', stationsRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

// Ensure a few playable stations exist on first boot.
seedIfEmpty();

export default app;
