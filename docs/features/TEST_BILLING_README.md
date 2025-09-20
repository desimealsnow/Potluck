# Comprehensive Billing & Payment Testing

This directory contains comprehensive tests for all billing and payment-related functionality using **LemonSqueezy** as the payment gateway.

## Overview

Our testing suite covers:

- ✅ **15+ API endpoints** for billing, subscriptions, payment methods, and invoices
- ✅ **LemonSqueezy integration** with realistic mock data
- ✅ **Webhook processing** for all subscription lifecycle events  
- ✅ **Database integration** with proper isolation between users
- ✅ **Error handling** for API failures, validation, and authorization
- ✅ **Unit tests** for services, controllers, and provider abstraction
- ✅ **Integration tests** for end-to-end workflows

## Test Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── payment-providers.service.spec.ts    # LemonSqueezy API integration
│   │   └── provider.factory.spec.ts             # Multi-provider abstraction
│   └── controllers/
│       └── billing.controller.spec.ts           # API endpoint controllers
├── integration/
│   └── billing-comprehensive.spec.ts            # End-to-end billing tests
├── fixtures/
│   ├── lemonSqueezyMocks.ts                    # Comprehensive LemonSqueezy mock data
│   └── factories.ts                            # Test data factories
└── helpers/
    └── dbHelpers.ts                             # Database test utilities
```

## Running Tests

### Quick Start

```bash
# Run all billing tests
./scripts/test-billing-comprehensive.sh

# Run specific test suite
npm test tests/integration/billing-comprehensive.spec.ts

# Run with coverage
npm run test:coverage -- --testPathPattern="billing|payment"
```

### Individual Test Suites

```bash
# Unit tests
npm test tests/unit/services/payment-providers.service.spec.ts
npm test tests/unit/controllers/billing.controller.spec.ts

# Integration tests  
npm test tests/integration/billing-comprehensive.spec.ts
```

## Test Scenarios

### 1. Billing Plans Management
- ✅ List active plans only
- ✅ Handle empty plans list
- ✅ Require authentication

### 2. Subscription Lifecycle
- ✅ Create checkout session with LemonSqueezy
- ✅ List user subscriptions (with proper isolation)
- ✅ Get subscription details (owner access only)
- ✅ Update subscription (plan changes, cancellation flags)
- ✅ Cancel subscription (immediate and end-of-period)
- ✅ Reactivate cancelled subscription
- ✅ Trial → Active → Cancelled workflow

### 3. Payment Methods
- ✅ Add new payment methods (Visa, Mastercard, etc.)
- ✅ List user payment methods only
- ✅ Update payment method details
- ✅ Set default payment method (with proper unset of others)
- ✅ Delete payment methods
- ✅ Multi-user isolation

### 4. Invoice Management
- ✅ List user invoices (chronologically ordered)
- ✅ Get individual invoice details
- ✅ Download invoice PDFs
- ✅ Handle different invoice statuses (paid, failed, refunded)

### 5. Webhook Processing
- ✅ `subscription_created` - New subscription activation
- ✅ `subscription_updated` - Plan changes, status updates  
- ✅ `subscription_cancelled` - Subscription termination
- ✅ `subscription_paused` - Temporary suspension
- ✅ `subscription_resumed` - Reactivation after pause
- ✅ `order_created` - Payment processing
- ✅ `order_refunded` - Refund handling
- ✅ Signature verification with HMAC-SHA256
- ✅ Unknown event handling

### 6. Error Handling & Edge Cases
- ✅ Invalid API keys and configuration
- ✅ Network failures and timeouts
- ✅ Malformed webhook payloads
- ✅ Invalid signature verification
- ✅ Non-existent resources (404s)
- ✅ Authorization failures (403s)
- ✅ Database connection issues

## Mock Data & Test Fixtures

### LemonSqueezy Mock Data

Our `lemonSqueezyMocks.ts` provides realistic test data including:

```typescript
// Complete API response structures
LemonSqueezyMockFactory.createCheckout()
LemonSqueezyMockFactory.createSubscription()
LemonSqueezyMockFactory.createOrder()

// Pre-built scenarios
LemonSqueezyTestScenarios.subscriptionLifecycle()
LemonSqueezyTestScenarios.paymentFailureRecovery()
LemonSqueezyTestScenarios.refundScenario()

// Webhook events
LemonSqueezyMockFactory.webhookEvents.subscriptionCreated()
LemonSqueezyMockFactory.webhookEvents.orderRefunded()
```

### Database Factories

Test data factories for consistent test scenarios:

```typescript
// Billing entities
BillingPlanFactory.buildLemonSqueezy()
SubscriptionFactory.buildActive()
PaymentMethodFactory.buildDefault()
InvoiceFactory.buildPaid()

// Complete scenarios
TestDataSets.completeEventScenario()
TestDataSets.userLifecycleData()
```

## API Endpoints Tested

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/billing/plans` | List active billing plans | ✅ |
| POST | `/billing/checkout/subscription` | Create checkout session | ✅ |
| GET | `/billing/subscriptions` | List user subscriptions | ✅ |
| GET | `/billing/subscriptions/:id` | Get subscription details | ✅ |
| PUT | `/billing/subscriptions/:id` | Update subscription | ✅ |
| DELETE | `/billing/subscriptions/:id` | Cancel subscription | ✅ |
| POST | `/billing/subscriptions/:id/reactivate` | Reactivate subscription | ✅ |
| GET | `/billing/payment-methods` | List payment methods | ✅ |
| POST | `/billing/payment-methods` | Add payment method | ✅ |
| GET | `/billing/payment-methods/:id` | Get payment method | ✅ |
| PUT | `/billing/payment-methods/:id` | Update payment method | ✅ |
| DELETE | `/billing/payment-methods/:id` | Delete payment method | ✅ |
| POST | `/billing/payment-methods/:id/set-default` | Set default method | ✅ |
| GET | `/billing/invoices` | List user invoices | ✅ |
| GET | `/billing/invoices/:id` | Get invoice details | ✅ |
| GET | `/billing/invoices/:id/download` | Download invoice PDF | ✅ |
| POST | `/billing/webhook/:provider` | Handle provider webhooks | ❌ |

## Environment Setup

Required environment variables for testing:

```bash
NODE_ENV=test
LEMONSQUEEZY_API_KEY=test-api-key
LEMONSQUEEZY_STORE_ID=12345
LEMONSQUEEZY_WEBHOOK_SECRET=test-webhook-secret
FRONTEND_URL=http://localhost:3000
```

## Integration with Existing Tests

The comprehensive billing tests:
- ✅ Extend existing test infrastructure
- ✅ Use existing user fixtures (`TEST_USERS`)
- ✅ Integrate with database helpers (`DbTestHelper`)
- ✅ Follow existing test patterns and conventions
- ✅ Maintain backward compatibility

## Test Data Isolation

Each test suite ensures proper isolation:
- ✅ Database cleanup between tests
- ✅ User-specific data filtering
- ✅ Mock service state reset
- ✅ Environment variable management

## Coverage Expectations

Target coverage for billing functionality:
- ✅ **Services**: 95%+ (payment providers, factory)
- ✅ **Controllers**: 90%+ (endpoint handlers) 
- ✅ **Integration**: 85%+ (full workflows)
- ✅ **Error Paths**: 90%+ (failure scenarios)

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- ✅ No external dependencies (uses mocks)
- ✅ Fast execution (< 2 minutes total)
- ✅ Deterministic results
- ✅ Clear failure reporting

## Future Enhancements

Planned improvements:
- 🔄 Performance testing under load
- 🔄 Additional payment providers (Stripe)
- 🔄 Subscription analytics testing  
- 🔄 Advanced webhook retry mechanisms
- 🔄 Real-time billing event testing

---

## Development Workflow

When making changes to billing functionality:

1. **Add/Update Tests First** - Follow TDD approach
2. **Run Specific Tests** - Use targeted test commands
3. **Verify Integration** - Run full billing test suite
4. **Check Coverage** - Ensure coverage targets met
5. **Update Documentation** - Keep this README current

## Common Issues & Solutions

### Mock API Responses
If LemonSqueezy API structure changes, update `lemonSqueezyMocks.ts` with the new response format.

### Database Schema Changes
Update `dbHelpers.ts` helper methods and factory constructors to match schema changes.

### Authentication Issues
Ensure test users are properly seeded and tokens are valid for the test duration.

---

**Ready to test your billing integration!** 🚀
