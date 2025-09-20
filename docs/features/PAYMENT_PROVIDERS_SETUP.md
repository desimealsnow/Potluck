# Payment Provider Integration Setup

This guide explains how to configure payment providers for payment processing in your Potluck application. The system supports a generic provider approach, making it easy to add and manage multiple payment providers.

## Environment Variables

Create a `.env` file in the `apps/server` directory with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# LemonSqueezy Configuration (Test Mode - Minimal Setup)
LEMONSQUEEZY_API_KEY=your_lemonsqueezy_test_api_key_here
# LEMONSQUEEZY_STORE_ID=optional_for_test_mode
# LEMONSQUEEZY_WEBHOOK_SECRET=optional_for_test_mode

# Other Payment Providers (Optional)
# STRIPE_SECRET_KEY=your_stripe_secret_key
# STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
# PAYPAL_CLIENT_SECRET=your_paypal_client_secret
# PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret
# RAZORPAY_SECRET_KEY=your_razorpay_secret_key
# RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here

# Test Configuration (for .env.test)
TEST_SUPABASE_URL=your_test_supabase_url_here
TEST_SUPABASE_SERVICE_ROLE_KEY=your_test_supabase_service_role_key_here
TEST_SUPABASE_ANON_KEY=your_test_supabase_anon_key_here
TEST_OWNER_EMAIL=test@example.com
TEST_OWNER_PASSWORD=testpassword123
```

## Generic Provider System

The application now uses a generic provider system that automatically detects available payment providers based on your environment configuration. You only need to set the API keys for the providers you want to use.

### Supported Providers

- **LemonSqueezy** - `lemonsqueezy` (Test mode friendly)
- **Stripe** - `stripe`
- **PayPal** - `paypal`
- **Razorpay** - `razorpay`
- **Square** - `square`
- **Paddle** - `paddle`

## Getting Payment Provider Credentials

### LemonSqueezy (Recommended for Test Mode)

1. **Create LemonSqueezy Account**
- Go to [LemonSqueezy](https://lemonsqueezy.com)
- Sign up for an account
- Complete the verification process

2. **Get Test API Key (Minimal Setup)**
- Go to Settings > API
- Create a new API key (test mode)
- Copy the API key and set it as `LEMONSQUEEZY_API_KEY`
- **That's it for test mode!** Store ID and webhook secret are optional

3. **Production Setup (Optional)**
- Get Store ID: Go to Stores in your dashboard, create a store, copy the Store ID
- Set up Webhook: Go to Settings > Webhooks, create webhook with URL: `https://yourdomain.com/api/v1/billing/webhook/lemonsqueezy`
- Copy the webhook secret and set it as `LEMONSQUEEZY_WEBHOOK_SECRET`

4. **Create Products and Variants (For Production)**
- In your LemonSqueezy store, create products for your subscription plans
- For each plan, create a variant with the pricing
- Note down the variant IDs - you'll need these for your billing plans

### Other Providers

The system also supports other payment providers. Simply set the appropriate environment variables:

- **Stripe**: Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- **PayPal**: Set `PAYPAL_CLIENT_SECRET` and `PAYPAL_WEBHOOK_SECRET`
- **Razorpay**: Set `RAZORPAY_SECRET_KEY` and `RAZORPAY_WEBHOOK_SECRET`
- **Square**: Set `SQUARE_ACCESS_TOKEN` and `SQUARE_WEBHOOK_SECRET`
- **Paddle**: Set `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET`

## Database Setup

You'll need to create billing plans in your database that correspond to your payment provider variants:

```sql
-- Example: Insert billing plans that map to payment provider variants
INSERT INTO billing_plans (id, price_id, provider, name, amount_cents, currency, interval, is_active)
VALUES 
  ('basic-plan-id', 'lemonsqueezy-variant-id-1', 'lemonsqueezy', 'Basic Plan', 999, 'usd', 'month', true),
  ('pro-plan-id', 'lemonsqueezy-variant-id-2', 'lemonsqueezy', 'Pro Plan', 1999, 'usd', 'month', true),
  ('team-plan-id', 'lemonsqueezy-variant-id-3', 'lemonsqueezy', 'Team Plan', 4999, 'usd', 'month', true);
```

## Usage

### Creating a Checkout Session

```javascript
// POST /api/v1/billing/checkout/subscription
{
  "plan_id": "basic-plan-id",
  "provider": "lemonsqueezy"
}
```

### Webhook Events

The generic webhook endpoint `/api/v1/billing/webhook/:provider` will receive events for:
- `subscription_created`
- `subscription_updated` 
- `subscription_cancelled`
- `subscription_resumed`
- `order_created`
- `order_refunded`

## Testing

1. Use LemonSqueezy's test mode for development
2. Test webhook events using LemonSqueezy's webhook testing tool
3. Verify that subscriptions are properly created and updated in your database

## Production Deployment

1. Update webhook URL to your production domain
2. Use production API keys
3. Ensure webhook secret is properly configured
4. Test all payment flows thoroughly

## Troubleshooting

### Common Issues

1. **API Key Invalid**: Verify the API key is correct and has proper permissions
2. **Store ID Not Found**: Ensure the store ID exists and is accessible
3. **Webhook Signature Invalid**: Check that the webhook secret matches
4. **Variant ID Mismatch**: Ensure billing plan `price_id` matches LemonSqueezy variant ID

### Debug Mode

Set `NODE_ENV=development` to see detailed error messages in the console.

## Support

For LemonSqueezy-specific issues, refer to their [documentation](https://docs.lemonsqueezy.com) or contact their support team.
