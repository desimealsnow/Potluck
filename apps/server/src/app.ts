import express from 'express';
import cors from 'cors';
import authRouter       from './routes/auth.routes';
import eventRoutes      from './routes/events.routes';
import billingRoutes    from './routes/billing.routes';
import discoveryRoutes from './routes/discovery.routes';
import userLocationRoutes from './routes/user-location.routes';
import userProfileRoutes from './routes/user-profile.routes';
import itemsLibraryRoutes from './routes/items.library.routes';
import mockRoutes       from './routes/mock.routes';
import { createPaymentContainer } from './services/payments.container';
import { authGuard } from './middleware/authGuard';
import type { Request } from 'express';
// Dev payments routes are optional; only import if available
let createDevPaymentsRoutes: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  createDevPaymentsRoutes = require('@payments/core').createDevPaymentsRoutes;
} catch {}
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

  // Public landing page for shared event links (no auth)
  app.get('/events/:eventId', (req, res) => {
    const { eventId } = req.params as { eventId: string };
    const appDeepLink = `potluck://event/${eventId}`;
    const apiBase = process.env.PUBLIC_BASE_URL || (process.env.API_BASE_URL?.replace(/\/api\/(v\d+)$/, '') || '');
    const canonicalUrl = `${apiBase || ''}/events/${eventId}`;
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Potluck – Event</title>
    <meta property="og:title" content="Potluck Event" />
    <meta property="og:description" content="Open this event in the Potluck app" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 0; background:#fafafa; }
      .wrap { max-width: 560px; margin: 48px auto; padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
      h1 { margin: 0 0 8px; font-size: 20px; }
      p { margin: 0 0 16px; color: #374151; }
      a.btn { display:inline-block; padding: 12px 16px; background:#7b2ff7; color:#fff; border-radius:10px; text-decoration:none; font-weight:800; }
      .muted { color:#6b7280; font-size: 14px; margin-top: 16px; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
    </style>
    <script>
      (function(){
        var link = '${appDeepLink}';
        var now = Date.now();
        // Try to open the app; if it fails, stay on this page
        var t = setTimeout(function(){ /* no-op fallback */ }, 1200);
        window.location.href = link;
      })();
    </script>
  </head>
  <body>
    <div class="wrap">
      <h1>Open in Potluck</h1>
      <p>Tap the button below to open this event in the Potluck app.</p>
      <p><a class="btn" href="${appDeepLink}">Open App</a></p>
      <p class="muted">If the app doesn't open, make sure it's installed and try again. Shareable link: <code>${canonicalUrl}</code></p>
    </div>
  </body>
  </html>`;
    res.set('Content-Type', 'text/html').send(html);
  });

  /* ---------- API namespaces ---------- */
  app.use('/api/v1/auth',      authRouter);
  app.use('/api/v1/events',    eventRoutes);   // items & participants come with it
  app.use('/api/v1/billing',   billingRoutes);
  app.use('/api/v1/discovery', discoveryRoutes);
  app.use('/api/v1/user-location', userLocationRoutes);
  app.use('/api/v1/user-profile', userProfileRoutes);
  app.use('/api/v1/items', itemsLibraryRoutes);
  
  /* ---------- Mock routes for testing ---------- */
  app.use('/', mockRoutes);
  if (process.env.NODE_ENV !== 'production' && createDevPaymentsRoutes) {
    const paymentsContainer = createPaymentContainer();
    app.use(
      '/api/v1/payments-dev',
      authGuard,
      createDevPaymentsRoutes(paymentsContainer, {
        getUserId: (req: Request & { user?: { id?: string } }) => req.user?.id,
        getUserEmail: (req: Request & { user?: { email?: string } }) => req.user?.email,
      })
    );

  }

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
