import express from 'express';
import cors from 'cors';
import authRouter       from './routes/auth.routes';
import eventRoutes      from './routes/events.routes';
import locationRoutes   from './routes/locations.routes';
import billingRoutes    from './routes/billing.routes';
import discoveryRoutes from './routes/discovery.routes';
import userLocationRoutes from './routes/user-location.routes';
import mockRoutes       from './routes/mock.routes';
import { createPaymentContainer } from './services/payments.container';
import { authGuard } from './middleware/authGuard';
import type { Request } from 'express';
// Temporarily disable dev payments routes to unblock build
// import { createDevPaymentsRoutes } from '@payments/core';
import { errorHandler } from './middleware/errorHandler';
import path from 'path';
import { raw } from 'body-parser';

export const createApp = () => {
  const app = express();
  
  // CORS – allow mobile dev origin and Authorization header
  app.use(
    cors({
      origin: [
        'http://localhost:8081',
        'http://127.0.0.1:8081',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: false,
      maxAge: 86400,
    })
  );
  app.options('*', cors());
  // Ensure raw body is available for webhook verification BEFORE JSON parsing
  // Map 'stripe' webhook to 'lemonsqueezy' provider
  app.post('/api/v1/billing/webhook/:provider', raw({ type: '*/*' }), (req, res, next) => {
    if (req.params.provider === 'stripe') {
      req.params.provider = 'lemonsqueezy';
    }
    next();
  });
  app.use(express.json());

  // Serve success/cancel static pages for payment return URLs
  app.use(express.static(path.resolve(__dirname, '../public')));

  /* ---------- API namespaces ---------- */
  app.use('/api/v1/auth',      authRouter);
  app.use('/api/v1/events',    eventRoutes);   // items & participants come with it
  app.use('/api/v1/locations', locationRoutes);
  app.use('/api/v1/billing',   billingRoutes);
  app.use('/api/v1/discovery', discoveryRoutes);
  app.use('/api/v1/user-location', userLocationRoutes);
  
  /* ---------- Mock routes for testing ---------- */
  app.use('/', mockRoutes);
  // if (process.env.NODE_ENV !== 'production') {
  //   const paymentsContainer = createPaymentContainer();
  //   app.use(
  //     '/api/v1/payments-dev',
  //     authGuard,
  //     createDevPaymentsRoutes(paymentsContainer, {
  //       getUserId: (req: Request & { user?: { id?: string } }) => req.user?.id,
  //       getUserEmail: (req: Request & { user?: { email?: string } }) => req.user?.email,
  //     })
  //   );
  // }

  // Always-on client log sink so logs appear in the server terminal even if NODE_ENV=production
  app.post('/api/v1/dev-log', express.json(), (req, res) => {
    try {
      const { level = 'info', message, context } = (req.body || {}) as { level?: string; message?: string; context?: unknown };
      const stamp = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log(`[client:${level}] ${stamp} ${message || ''}`, context || '');
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: (e as Error).message });
    }
  });

  /* ---------- Health check route ---------- */
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  /* ---------- Global error handler ---------- */
  app.use(errorHandler);

  return app;
};
