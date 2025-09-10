#!/usr/bin/env node

/**
 * LemonSqueezy API Test Script
 * Tests the connection to LemonSqueezy API and validates configuration
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

console.log('🧪 LemonSqueezy API Test');
console.log('========================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`API Key: ${LEMONSQUEEZY_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`Store ID: ${LEMONSQUEEZY_STORE_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`Webhook Secret: ${LEMONSQUEEZY_WEBHOOK_SECRET ? '✅ Set' : '⚠️  Optional'}\n`);

if (!LEMONSQUEEZY_API_KEY) {
  console.error('❌ LEMONSQUEEZY_API_KEY is required');
  process.exit(1);
}

if (!LEMONSQUEEZY_STORE_ID) {
  console.warn('⚠️  LEMONSQUEEZY_STORE_ID not set - will test API connection only');
  console.warn('   To test full checkout flow, set up a store and add LEMONSQUEEZY_STORE_ID');
}

// Test API connection
async function testApiConnection() {
  try {
    console.log('🔌 Testing API Connection...');
    
    const response = await fetch('https://api.lemonsqueezy.com/v1/stores', {
      headers: {
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Connection successful');
    console.log(`📊 Found ${data.data.length} store(s)`);

    // Check if our store ID exists (if provided)
    let ourStore = null;
    if (LEMONSQUEEZY_STORE_ID) {
      ourStore = data.data.find(store => store.id === LEMONSQUEEZY_STORE_ID);
      if (ourStore) {
        console.log(`✅ Store ID ${LEMONSQUEEZY_STORE_ID} found: "${ourStore.attributes.name}"`);
      } else {
        console.log(`❌ Store ID ${LEMONSQUEEZY_STORE_ID} not found in your stores`);
        console.log('Available stores:');
        data.data.forEach(store => {
          console.log(`  - ${store.id}: ${store.attributes.name}`);
        });
      }
    } else {
      console.log('ℹ️  No store ID provided - showing all available stores:');
      data.data.forEach(store => {
        console.log(`  - ${store.id}: ${store.attributes.name}`);
      });
      if (data.data.length > 0) {
        console.log(`\n💡 To test full checkout flow, set LEMONSQUEEZY_STORE_ID to one of the above store IDs`);
      }
    }

    return ourStore;
  } catch (error) {
    console.error('❌ API Connection failed:', error.message);
    throw error;
  }
}

// Test store products
async function testStoreProducts(storeId) {
  if (!storeId) {
    console.log('\n⚠️  Skipping products test - no store ID provided');
    return [];
  }

  try {
    console.log('\n🛍️  Testing Store Products...');
    
    const response = await fetch(`https://api.lemonsqueezy.com/v1/products?filter[store_id]=${storeId}`, {
      headers: {
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Found ${data.data.length} product(s) in store`);

    if (data.data.length === 0) {
      console.log('⚠️  No products found. You need to create products in your LemonSqueezy store.');
      return [];
    }

    // List products and their variants
    for (const product of data.data) {
      console.log(`\n📦 Product: ${product.attributes.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Status: ${product.attributes.status}`);
      
      // Get variants for this product
      const variantsResponse = await fetch(`https://api.lemonsqueezy.com/v1/variants?filter[product_id]=${product.id}`, {
        headers: {
          'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
      });

      if (variantsResponse.ok) {
        const variantsData = await variantsResponse.json();
        console.log(`   Variants (${variantsData.data.length}):`);
        variantsData.data.forEach(variant => {
          console.log(`     - ${variant.attributes.name}: $${variant.attributes.price} (${variant.attributes.interval}) - ID: ${variant.id}`);
        });
      }
    }

    return data.data;
  } catch (error) {
    console.error('❌ Products test failed:', error.message);
    throw error;
  }
}

// Test checkout creation
async function testCheckoutCreation(storeId, variantId) {
  if (!storeId || !variantId) {
    console.log('\n⚠️  Skipping checkout test - store ID or variant ID not provided');
    return null;
  }

  try {
    console.log('\n🛒 Testing Checkout Creation...');
    
    const checkoutData = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: 'test@example.com',
            name: 'Test User',
            custom: {
              user_id: 'test-user-123',
              plan_id: 'test-plan',
            },
          },
          product_options: {
            enabled_variants: [variantId],
            redirect_url: 'https://example.com/success',
            receipt_button_text: 'Return to App',
            receipt_thank_you_note: 'Thank you for subscribing!',
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: storeId,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId,
            },
          },
        },
      },
    };

    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ Checkout creation successful');
    console.log(`🔗 Checkout URL: ${data.data.attributes.url}`);
    
    return data.data;
  } catch (error) {
    console.error('❌ Checkout creation failed:', error.message);
    throw error;
  }
}

// Main test function
async function runTests() {
  try {
    const store = await testApiConnection();
    
    if (LEMONSQUEEZY_STORE_ID) {
      const products = await testStoreProducts(LEMONSQUEEZY_STORE_ID);
      
      if (products.length > 0) {
        // Test checkout with first variant of first product
        const firstProduct = products[0];
        const variantsResponse = await fetch(`https://api.lemonsqueezy.com/v1/variants?filter[product_id]=${firstProduct.id}`, {
          headers: {
            'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
          },
        });

        if (variantsResponse.ok) {
          const variantsData = await variantsResponse.json();
          if (variantsData.data.length > 0) {
            const firstVariant = variantsData.data[0];
            await testCheckoutCreation(LEMONSQUEEZY_STORE_ID, firstVariant.id);
          }
        }

        console.log('\n🎉 All tests passed! Your LemonSqueezy integration is ready.');
        console.log('\n📝 Next steps:');
        console.log('1. Update your billing_plans table with the correct variant IDs');
        console.log('2. Test the full payment flow in your app');
        console.log('3. Set up webhooks for production');
      } else {
        console.log('\n⚠️  API connection successful, but no products found.');
        console.log('📝 Next steps:');
        console.log('1. Create products in your LemonSqueezy store');
        console.log('2. Run this test again to verify checkout creation');
      }
    } else {
      console.log('\n✅ API connection successful!');
      console.log('📝 Next steps:');
      console.log('1. Set up a LemonSqueezy store');
      console.log('2. Set LEMONSQUEEZY_STORE_ID in your .env file');
      console.log('3. Run this test again to verify full integration');
    }

  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
