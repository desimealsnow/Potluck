# LemonSqueezy Test Setup Guide

This guide will help you set up LemonSqueezy for testing the payment integration before going to production.

## 🎯 Why Test with Real LemonSqueezy?

- **Real API Integration**: Test actual LemonSqueezy API calls
- **Real Checkout Flow**: Experience the actual user checkout process
- **Webhook Testing**: Test webhook handling for subscription events
- **Production Readiness**: Ensure everything works before going live

## 📋 Prerequisites

1. **LemonSqueezy Account**: Sign up at [lemonsqueezy.com](https://lemonsqueezy.com)
2. **API Key**: Get your test API key from LemonSqueezy dashboard
3. **Test Store**: Create a test store in LemonSqueezy

## 🚀 Step-by-Step Setup

### Step 1: Create LemonSqueezy Account

1. Go to [lemonsqueezy.com](https://lemonsqueezy.com)
2. Click "Sign Up" and create your account
3. Verify your email address

### Step 2: Get API Key

1. Log into your LemonSqueezy dashboard
2. Go to **Settings** → **API**
3. Click **"Create API Key"**
4. Name it "Potluck Test" or similar
5. Copy the API key (starts with `sk_test_`)

### Step 3: Create Test Store

1. In your LemonSqueezy dashboard, go to **Stores**
2. Click **"Create Store"**
3. Fill in store details:
   - **Store Name**: "Potluck Test Store"
   - **Store URL**: `https://your-domain.com` (can be placeholder for test)
   - **Currency**: USD (or your preferred currency)
4. Click **"Create Store"**
5. Copy the **Store ID** from the store settings

### Step 4: Create Test Product

1. In your store, go to **Products**
2. Click **"Create Product"**
3. Fill in product details:
   - **Product Name**: "Potluck Pro Plan"
   - **Description**: "Monthly subscription for Potluck Pro features"
4. Click **"Create Product"**

### Step 5: Create Product Variants

1. In your product, go to **Variants**
2. Click **"Create Variant"**
3. Create variants for each plan:

   **Free Plan:**
   - Name: "Free Plan"
   - Price: $0.00
   - Billing Interval: One-time
   - Status: Active

   **Pro Plan:**
   - Name: "Pro Plan"
   - Price: $29.99
   - Billing Interval: Monthly
   - Status: Active

   **Team Plan:**
   - Name: "Team Plan"
   - Price: $59.99
   - Billing Interval: Monthly
   - Status: Active

4. Copy the **Variant ID** for each plan (you'll need these)

### Step 6: Set Up Webhook (Optional for Test)

1. Go to **Settings** → **Webhooks**
2. Click **"Create Webhook"**
3. Set webhook URL: `https://your-domain.com/api/v1/billing/webhook/lemonsqueezy`
4. Select events:
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `order_created`
5. Copy the **Webhook Secret**

### Step 7: Configure Environment Variables

Create or update your `.env` file in `apps/server/`:

```bash
# LemonSqueezy Configuration
LEMONSQUEEZY_API_KEY=sk_test_your_api_key_here
LEMONSQUEEZY_STORE_ID=your_store_id_here
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here

# Other required variables
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Step 8: Update Database with Plan IDs

You need to update your `billing_plans` table to use the LemonSqueezy variant IDs:

```sql
-- Update your billing plans with LemonSqueezy variant IDs
UPDATE billing_plans 
SET price_id = 'your_lemonsqueezy_variant_id_here'
WHERE name = 'Pro Plan' AND provider = 'lemonsqueezy';

-- Repeat for other plans
```

## 🧪 Testing the Integration

### 1. Start Your Server

```bash
cd apps/server
npm run dev
```

### 2. Check Environment Variables

The server will log the environment variable status on startup:

```
🔍 Environment Variables Check:
================================
📋 Required Variables:
✅ LEMONSQUEEZY_API_KEY: sk_test_...
✅ LEMONSQUEEZY_STORE_ID: your_store_id...

🍋 LemonSqueezy Configuration:
API Key: ✅ Set
Store ID: ✅ Set
ℹ️  Running in PRODUCTION MODE
```

### 3. Test Checkout Flow

1. Open your mobile app
2. Go to Plans screen
3. Click "Get Started" on any plan
4. You should be redirected to a real LemonSqueezy checkout page
5. Complete the test payment (use test card: `4242 4242 4242 4242`)

### 4. Test Webhook (Optional)

1. Use a tool like ngrok to expose your local server
2. Update webhook URL in LemonSqueezy dashboard
3. Complete a test payment
4. Check server logs for webhook events

## 🎯 Test Cards

LemonSqueezy provides test cards for testing:

- **Successful Payment**: `4242 4242 4242 4242`
- **Declined Payment**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

## 🔍 Troubleshooting

### Common Issues

1. **"Provider not available" error**:
   - Check that all environment variables are set
   - Verify API key is correct
   - Check store ID is correct

2. **"Invalid variant ID" error**:
   - Verify variant IDs in your database match LemonSqueezy
   - Check that variants are active in LemonSqueezy

3. **Webhook not working**:
   - Ensure webhook URL is accessible
   - Check webhook secret is correct
   - Verify webhook events are selected

### Debug Commands

```bash
# Check environment variables
cd apps/server
node -e "require('dotenv').config(); console.log('API Key:', process.env.LEMONSQUEEZY_API_KEY ? 'Set' : 'Missing'); console.log('Store ID:', process.env.LEMONSQUEEZY_STORE_ID ? 'Set' : 'Missing');"

# Test API connection
curl -H "Authorization: Bearer $LEMONSQUEEZY_API_KEY" https://api.lemonsqueezy.com/v1/stores
```

## 📚 Next Steps

Once testing is complete:

1. **Update to Production**: Change API keys to live keys
2. **Set Up Live Store**: Create production store and products
3. **Configure Live Webhooks**: Update webhook URLs for production
4. **Monitor**: Set up monitoring for payment failures and webhook events

## 🆘 Support

- **LemonSqueezy Docs**: [docs.lemonsqueezy.com](https://docs.lemonsqueezy.com)
- **LemonSqueezy Support**: [lemonsqueezy.com/support](https://lemonsqueezy.com/support)
- **API Reference**: [docs.lemonsqueezy.com/api](https://docs.lemonsqueezy.com/api)
