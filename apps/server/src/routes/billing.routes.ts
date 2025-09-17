import { Router } from 'express';
import BillingController from '../controllers/billing.controller';
import { raw } from 'body-parser';
import { createWebhookHandler } from '@payments/core';
import { createPaymentContainer } from '../services/payments.container';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// Plans (public - no auth required)
router.get('/plans', BillingController.listPlans);

// Checkout (requires auth)
router.post('/checkout/subscription', authGuard, BillingController.startCheckout);

// Subscriptions (requires auth)
router.get('/subscriptions', authGuard, BillingController.listMySubscriptions);
router.get('/subscriptions/:subscriptionId', authGuard, BillingController.getSubscription);
router.put('/subscriptions/:subscriptionId', authGuard, BillingController.updateSubscription);
router.delete('/subscriptions/:subscriptionId', authGuard, BillingController.cancelSubscription);
router.post('/subscriptions/:subscriptionId/reactivate', authGuard, BillingController.reactivateSubscription);

// Payment methods (requires auth)
router.get('/payment-methods', authGuard, BillingController.listPaymentMethods);
router.post('/payment-methods', authGuard, BillingController.addPaymentMethod);
router.get('/payment-methods/:methodId', authGuard, BillingController.getPaymentMethod);
router.put('/payment-methods/:methodId', authGuard, BillingController.updatePaymentMethod);
router.delete('/payment-methods/:methodId', authGuard, BillingController.deletePaymentMethod);
router.post('/payment-methods/:methodId/set-default', authGuard, BillingController.setDefaultPaymentMethod);

// Invoices (requires auth)
router.get('/invoices', authGuard, BillingController.listInvoices);
router.get('/invoices/:invoiceId', authGuard, BillingController.getInvoice);
router.get('/invoices/:invoiceId/download', authGuard, BillingController.downloadInvoice);

// Webhooks (no auth required) - Generic provider webhook
// Webhook with raw-body for signature verification
const paymentsContainer = createPaymentContainer();
// Map 'stripe' webhook to 'lemonsqueezy' provider
router.post('/webhook/:provider', raw({ type: '*/*' }), (req, res, next) => {
  if (req.params.provider === 'stripe') {
    req.params.provider = 'lemonsqueezy';
  }
  next();
}, createWebhookHandler(paymentsContainer));

export default router;


