# LemonSqueezy Configuration

## Environment Variables

Add these to your `.env` file:

```bash
# LemonSqueezy API Configuration
LEMONSQUEEZY_API_KEY=your_api_key_here
LEMONSQUEEZY_STORE_ID=your_store_id_here
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
```

## Database-Driven Variant Mapping

The system automatically maps LemonSqueezy variant IDs to billing plans using the `external_id` column in the `billing_plans` table.

### Database Setup

1. **Run the migration** to add the `external_id` column:
   ```sql
   -- See: db/migrations/004_add_external_id_to_billing_plans.sql
   ALTER TABLE billing_plans ADD COLUMN external_id VARCHAR(255);
   CREATE INDEX idx_billing_plans_external_id ON billing_plans(external_id);
   ```

2. **Set up your plans** with their LemonSqueezy variant IDs:
   ```sql
   -- Update existing plans
   UPDATE billing_plans 
   SET external_id = '992413', provider = 'lemonsqueezy' 
   WHERE name = 'pro';

   UPDATE billing_plans 
   SET external_id = '992415', provider = 'lemonsqueezy' 
   WHERE name = 'basic';
   ```

3. **Add new plans** as needed:
   ```sql
   INSERT INTO billing_plans (id, name, external_id, provider, amount_cents, currency, interval, is_active)
   VALUES (gen_random_uuid(), 'premium', '992416', 'lemonsqueezy', 2999, 'usd', 'month', true);
   ```

### How It Works

- The system automatically queries `billing_plans` where `provider = 'lemonsqueezy'` and `external_id IS NOT NULL`
- It builds a mapping: `{external_id: plan_uuid}` dynamically
- No environment variables or code changes needed for new stores/plans

### Benefits

- ✅ **Scalable**: Add unlimited stores/plans without code changes
- ✅ **Multi-tenant**: Each tenant can have different variant mappings
- ✅ **Dynamic**: Changes take effect immediately without restarts
- ✅ **Maintainable**: All configuration in one place (database)
