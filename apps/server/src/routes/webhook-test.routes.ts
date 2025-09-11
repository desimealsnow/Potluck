import { Router, Request, Response } from 'express';

const router = Router();

// Test webhook endpoint for debugging
router.post('/test-webhook', (req: Request, res: Response) => {
  console.log('🧪 Test webhook received:', {
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Test webhook received successfully',
    timestamp: new Date().toISOString(),
    receivedData: {
      headers: req.headers,
      body: req.body
    }
  });
});

// Webhook status endpoint
router.get('/webhook-status', (req: Request, res: Response) => {
  res.json({
    status: 'active',
    endpoint: '/api/v1/billing/webhook/lemonsqueezy',
    timestamp: new Date().toISOString(),
    instructions: [
      '1. Start ngrok: ngrok http 3000',
      '2. Configure webhook URL in LemonSqueezy dashboard',
      '3. Test with: POST /api/v1/billing/webhook/lemonsqueezy',
      '4. Monitor logs for webhook events'
    ]
  });
});

export default router;
