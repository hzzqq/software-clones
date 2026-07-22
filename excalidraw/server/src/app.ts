import express from 'express';
import cors from 'cors';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import scenesRouter from './routes/scenes';

/**
 * Builds and configures the Express application with shared middleware and
 * the `/api` route prefix for the Excalidraw hand-drawn whiteboard clone.
 * Only scene persistence lives server-side; drawing happens client-side.
 */
export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '8mb' }));

// Mount API routes under the shared `/api` prefix.
app.use('/api', healthRouter);
app.use('/api', scenesRouter);

// Catch-all 404 and centralized error handler (must be registered last).
app.use(notFound);
app.use(errorHandler);

export default app;
