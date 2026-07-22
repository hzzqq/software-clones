import express from 'express';
import cors from 'cors';
import { CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';
import { boardsRouter } from './routes/boards';
import { listsRouter } from './routes/lists';
import { cardsRouter } from './routes/cards';
import { tagsRouter } from './routes/tags';

export const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

app.use('/api', healthRouter);
app.use('/api', boardsRouter);
app.use('/api', listsRouter);
app.use('/api', cardsRouter);
app.use('/api', tagsRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
