import express from 'express';
import cors from 'cors';
import { securityHeaders } from './middleware/securityHeaders';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { widgetsRouter } from './routes/widgets';
import { proxyRouter } from './routes/proxy';
import { configRouter } from './routes/config';

export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));

app.use('/api', healthRouter);
app.use('/api', widgetsRouter);
app.use('/api', proxyRouter);
app.use('/api', configRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
