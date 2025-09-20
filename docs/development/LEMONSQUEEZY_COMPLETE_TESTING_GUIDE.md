# LemonSqueezy Complete Testing Guide

This guide covers the complete LemonSqueezy integration testing workflow, including webhook setup with ngrok as described in their documentation.

## 🎯 **Complete Testing Flow**

1. **✅ API Integration**: Test API connection and store access
2. **✅ Product Setup**: Create test products in LemonSqueezy
3. **✅ Webhook Setup**: Configure webhooks with ngrok
4. **✅ End-to-End Testing**: Test complete payment flow with webhooks

## 📋 **Prerequisites**

- LemonSqueezy account with test mode enabled
- ngrok installed ([download here](https://ngrok.com/download))
- Your server running on localhost:3000

## 🚀 **Step 1: API Integration Testing**

### Test Your API Connection

```bash
cd apps/server
npm run test:lemonsqueezy
```

**Expected Output:**
```
✅ API Connection successful
✅ Store ID 221200 found: "Arpchan"
✅ Unit test passed - API key and store ID are working correctly
```

## 🛍️ **Step 2: Create Test Products**

### In LemonSqueezy Dashboard:

1. **Go to Products** → Create Product
2. **Product Name**: "Potluck Pro Plan"
3. **Description**: "Monthly subscription for Potluck Pro features"
4. **Create Variants**:
   - **Name**: "Pro Plan"
   - **Price**: $29.99
   - **Billing Interval**: Monthly
   - **Status**: Active
5. **Copy the Variant ID** (you'll need this)

### Update Your Database

```sql
UPDATE billing_plans 
SET price_id = 'your_variant_id_here'
WHERE name = 'Pro Plan' AND provider = 'lemonsqueezy';
```

## 🔗 **Step 3: Webhook Setup with ngrok**

### Install and Run ngrok

```bash
# Install ngrok (if not already installed)
# Download from https://ngrok.com/download

# Start your server
cd apps/server
npm run dev

# In another terminal, start ngrok
ngrok http 3000
```

**ngrok Output:**
```
ngrok                                                                   (Ctrl+C to quit)

Session Status                online
Account                       your-account (Plan: Free)
Version                       3.0.0
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.dev -> http://localhost:3000
```

### Configure LemonSqueezy Webhook

1. **Go to LemonSqueezy Dashboard** → Settings → Webhooks
2. **Click "+" to add new webhook**
3. **Webhook URL**: `https://abc123.ngrok-free.dev/api/v1/billing/webhook/lemonsqueezy`
4. **Signing Secret**: Generate a random string (6-40 characters)
5. **Select Events**:
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `order_created`
   - `order_refunded`
6. **Save the webhook**

### Update Environment Variables

Add to your `.env` file:
```bash
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
```

## 🧪 **Step 4: Complete End-to-End Testing**

### Test the Complete Flow

1. **Start your server**:
   ```bash
   cd apps/server
   npm run dev
   ```

2. **Start ngrok** (in another terminal):
   ```bash
   ngrok http 3000
   ```

3. **Test in your mobile app**:
   - Click "Get Started" on any plan
   - You should get a real LemonSqueezy checkout URL
   - Complete the payment with test card: `4242 4242 4242 4242`

4. **Monitor webhook events**:
   - Check your server logs for webhook events
   - You should see events like:
     ```
     🔔 LemonSqueezy webhook received: {
       eventType: 'subscription_created',
       eventId: '12345',
       timestamp: '2025-01-10T10:00:00Z'
     }
     ✅ Subscription created: {
       id: 'sub_123',
       status: 'active',
       customerId: 'cust_456'
     }
     ```

## 🎯 **Test Card Numbers**

Use these test card numbers for testing:

- **Visa**: `4242 4242 4242 4242`
- **Mastercard**: `5555 5555 5555 4444`
- **American Express**: `3782 822463 10005`
- **Insufficient funds**: `4000 0000 0000 9995`
- **Expired card**: `4000 0000 0000 0069`
- **3D Secure**: `4000 0027 6000 3184`

## 🔍 **Webhook Event Types**

The integration handles these webhook events:

### Subscription Events
- **`subscription_created`**: New subscription activated
- **`subscription_updated`**: Subscription details changed
- **`subscription_cancelled`**: Subscription cancelled
- **`subscription_resumed`**: Subscription reactivated

### Order Events
- **`order_created`**: New order placed
- **`order_refunded`**: Order refunded

## 📊 **Monitoring and Debugging**

### Check Webhook Events

1. **Server Logs**: Watch your server console for webhook events
2. **ngrok Interface**: Visit `http://127.0.0.1:4040` to see ngrok traffic
3. **LemonSqueezy Dashboard**: Check webhook delivery status

### Common Issues

1. **Webhook not receiving events**:
   - Check ngrok is running
   - Verify webhook URL is correct
   - Check webhook secret matches

2. **Signature verification failed**:
   - Ensure `LEMONSQUEEZY_WEBHOOK_SECRET` is set correctly
   - Check webhook secret in LemonSqueezy dashboard

3. **Checkout URL not working**:
   - Verify products are created in test mode
   - Check variant IDs are correct in database

## 🚀 **Production Deployment**

When ready for production:

1. **Update webhook URL** to your production domain
2. **Switch to live API keys** (remove `_test` suffix)
3. **Update environment variables** for production
4. **Test with real payment methods**

## 📚 **Additional Resources**

- [LemonSqueezy Webhooks Documentation](https://docs.lemonsqueezy.com/help/webhooks)
- [LemonSqueezy Test Mode Guide](https://docs.lemonsqueezy.com/help/getting-started/test-mode)
- [ngrok Documentation](https://ngrok.com/docs)

## ✅ **Success Checklist**

- [ ] API connection working
- [ ] Store ID configured
- [ ] Test products created
- [ ] ngrok running
- [ ] Webhook configured
- [ ] Webhook secret set
- [ ] Test payment completed
- [ ] Webhook events received
- [ ] Database updated with subscription data

This completes the full LemonSqueezy integration testing workflow! 🎉
