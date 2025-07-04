import express from 'express';
import authRouter       from './routes/auth.routes';
import eventRoutes      from './routes/events.routes';
import locationRoutes   from './routes/locations.routes';
import { errorHandler } from './middleware/errorHandler';

export const createApp = () => {
  const app = express();
  app.use(express.json());

  /* ---------- API namespaces ---------- */
  app.use('/api/v1/auth',      authRouter);
  app.use('/api/v1/events',    eventRoutes);   // items & participants come with it
  app.use('/api/v1/locations', locationRoutes);

  /* ---------- Health check route ---------- */
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  /* ---------- Global error handler ---------- */
  app.use(errorHandler);

  return app;
};
