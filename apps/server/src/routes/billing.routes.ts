import { Router } from 'express';
import BillingController from '../controllers/billing.controller';

const router = Router();

// Plans
router.get('/plans', BillingController.listPlans);

// Checkout
router.post('/checkout/subscription', BillingController.startCheckout);

// Subscriptions
router.get('/subscriptions', BillingController.listMySubscriptions);
router.get('/subscriptions/:subscriptionId', BillingController.getSubscription);
router.put('/subscriptions/:subscriptionId', BillingController.updateSubscription);
router.delete('/subscriptions/:subscriptionId', BillingController.cancelSubscription);
router.post('/subscriptions/:subscriptionId/reactivate', BillingController.reactivateSubscription);

// Payment methods
router.get('/payment-methods', BillingController.listPaymentMethods);
router.post('/payment-methods', BillingController.addPaymentMethod);
router.get('/payment-methods/:methodId', BillingController.getPaymentMethod);
router.put('/payment-methods/:methodId', BillingController.updatePaymentMethod);
router.delete('/payment-methods/:methodId', BillingController.deletePaymentMethod);
router.post('/payment-methods/:methodId/set-default', BillingController.setDefaultPaymentMethod);

// Invoices
router.get('/invoices', BillingController.listInvoices);
router.get('/invoices/:invoiceId', BillingController.getInvoice);
router.get('/invoices/:invoiceId/download', BillingController.downloadInvoice);

// Webhooks (no auth required) - Generic provider webhook
router.post('/webhook/:provider', BillingController.handleProviderWebhook);

export default router;


