# 🚀 Getting Started with payment-core

## Quick Install
```bash
npm install payment-core
```

## Basic Usage

### 1. Import the package
```typescript
import { PaymentService, providerRegistry } from 'payment-core';
```

### 2. Create a payment service
```typescript
const paymentService = new PaymentService({
  providers: providerRegistry,
  // ... implement your adapters
});
```

### 3. Create a checkout
```typescript
const checkout = await paymentService.createCheckout({
  tenantId: 'default',
  planId: 'your-plan-id',
  userId: 'user-123',
  userEmail: 'user@example.com',
  provider: 'lemonsqueezy'
});
```

## 📚 Full Documentation

For complete documentation, examples, and advanced usage:

- **Main README**: See the full README.md in this package
- **GitHub Repository**: https://github.com/yourusername/potluck/tree/main/packages/payments
- **Issues & Support**: https://github.com/yourusername/potluck/issues

## 🎯 What You Get

- ✅ **Provider-agnostic** payment processing
- ✅ **LemonSqueezy** provider included
- ✅ **Webhook handling** with idempotency
- ✅ **Express middleware** ready to use
- ✅ **TypeScript** support with full types
- ✅ **Multi-tenant** architecture
- ✅ **Dev/test tools** for development

## 🔧 Next Steps

1. **Read the full README.md** for detailed setup
2. **Implement the required ports** (logger, persistence, etc.)
3. **Configure your payment provider** (LemonSqueezy, Stripe, etc.)
4. **Set up webhook endpoints** for payment processing
5. **Test with dev tools** before going live

## 💡 Need Help?

- Check the **FAQ section** in the main README
- Look at **examples** in the GitHub repository
- Open an **issue** if you need support

---

**Happy coding!** 🎉
