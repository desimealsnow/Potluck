import { Router, Request, Response } from 'express';

const router = Router();

// Mock checkout page for testing
router.get('/mock-checkout', (req: Request, res: Response) => {
  const { plan, user, email, name, test_mode, no_products } = req.query;
  const isTestMode = test_mode === 'true';
  const hasNoProducts = no_products === 'true';
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isTestMode ? 'LemonSqueezy Test Mode' : 'Potluck - Mock Checkout'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .checkout-container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 20px;
        }
        
        .title {
            font-size: 24px;
            color: #333;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
        }
        
        .plan-info {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .plan-name {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        
        .plan-price {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .user-info {
            background: #e3f2fd;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 30px;
            text-align: left;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .info-label {
            color: #666;
            font-weight: 500;
        }
        
        .info-value {
            color: #333;
            font-weight: 600;
        }
        
        .buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        
        .btn {
            padding: 15px 30px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .btn-secondary {
            background: #f8f9fa;
            color: #666;
            border: 2px solid #e9ecef;
        }
        
        .btn-secondary:hover {
            background: #e9ecef;
        }
        
        .test-mode {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            color: #856404;
        }
        
        .test-mode strong {
            display: block;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="checkout-container">
        <div class="logo">🍲 Potluck</div>
        <h1 class="title">${hasNoProducts ? 'LemonSqueezy Setup Required' : (isTestMode ? 'LemonSqueezy Test Mode' : 'Mock Checkout')}</h1>
        <p class="subtitle">${hasNoProducts ? 'Store configured but no products found' : (isTestMode ? 'API connection successful, but no store configured' : 'This is a test checkout page for development')}</p>
        
        <div class="test-mode">
            <strong>${hasNoProducts ? '⚠️ No Products Found' : (isTestMode ? '🧪 API Test Mode' : '🧪 Test Mode')}</strong>
            ${hasNoProducts ? 
              'Your LemonSqueezy store is configured, but no products are available. You need to create products and variants in your LemonSqueezy dashboard.' : 
              (isTestMode ? 
                'Your LemonSqueezy API key is working, but no store is configured. This is a local mock checkout for testing the integration flow.' : 
                'This is a mock checkout page. In production, this would be handled by LemonSqueezy.'
              )
            }
        </div>
        
        <div class="plan-info">
            <div class="plan-name">${plan || 'Pro Plan'}</div>
            <div class="plan-price">$29.99/month</div>
            <p>Unlimited events, advanced features, and more!</p>
        </div>
        
        <div class="user-info">
            <div class="info-row">
                <span class="info-label">User ID:</span>
                <span class="info-value">${user || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${email || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${name || 'N/A'}</span>
            </div>
        </div>
        
        ${hasNoProducts ? `
        <div class="test-mode" style="margin-top: 20px; text-align: left;">
            <strong>🚀 Next Steps to Enable Real Checkouts:</strong>
            <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Go to your <a href="https://lemonsqueezy.com" target="_blank" style="color: #667eea;">LemonSqueezy dashboard</a></li>
                <li>Navigate to your store (ID: ${user || 'N/A'})</li>
                <li>Click "Products" and create a new product</li>
                <li>Add variants for each plan (Pro, Basic, etc.)</li>
                <li>Copy the variant IDs and update your database</li>
                <li>Test the checkout flow again</li>
            </ol>
            <p style="margin: 10px 0 0 0; font-size: 14px;"><strong>See:</strong> <code>apps/server/LEMONSQUEEZY_TEST_SETUP.md</code> for detailed instructions</p>
        </div>
        ` : (isTestMode ? `
        <div class="test-mode" style="margin-top: 20px; text-align: left;">
            <strong>🚀 Next Steps to Enable Real Checkouts:</strong>
            <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Go to <a href="https://lemonsqueezy.com" target="_blank" style="color: #667eea;">lemonsqueezy.com</a> and create an account</li>
                <li>Create a test store in your LemonSqueezy dashboard</li>
                <li>Create products with variants for your plans</li>
                <li>Set <code>LEMONSQUEEZY_STORE_ID</code> in your .env file</li>
                <li>Restart your server and test again</li>
            </ol>
            <p style="margin: 10px 0 0 0; font-size: 14px;"><strong>See:</strong> <code>apps/server/LEMONSQUEEZY_TEST_SETUP.md</code> for detailed instructions</p>
        </div>
        ` : '')}
        
        <div class="buttons">
            <button class="btn btn-primary" onclick="simulateSuccess()">
                ✅ Complete Payment (Mock)
            </button>
            <button class="btn btn-secondary" onclick="goBack()">
                ← Go Back
            </button>
        </div>
    </div>
    
    <script>
        function simulateSuccess() {
            // Simulate successful payment
            alert('🎉 Payment successful! (This is a mock)');
            
            // In a real app, you would redirect back to your app
            // For now, we'll just show a success message
            document.body.innerHTML = \`
                <div class="checkout-container">
                    <div class="logo">🍲 Potluck</div>
                    <h1 class="title">Payment Successful!</h1>
                    <p class="subtitle">Your subscription has been activated</p>
                    <div class="plan-info">
                        <div class="plan-name">${plan || 'Pro Plan'}</div>
                        <div class="plan-price">$29.99/month</div>
                        <p>Welcome to Potluck Pro! 🎉</p>
                    </div>
                    <button class="btn btn-primary" onclick="goBack()">
                        Return to App
                    </button>
                </div>
            \`;
        }
        
        function goBack() {
            // Close the window/tab
            window.close();
            
            // If window.close() doesn't work, try to go back
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // Fallback: redirect to a success page
                window.location.href = '/success';
            }
        }
        
        // Auto-focus on the payment button for better UX
        window.onload = function() {
            const paymentBtn = document.querySelector('.btn-primary');
            if (paymentBtn) {
                paymentBtn.focus();
            }
        };
    </script>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Success page
router.get('/success', (req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful - Potluck</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .success-container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
        }
        .success-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        .title {
            font-size: 24px;
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
        }
        .btn {
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="success-container">
        <div class="success-icon">✅</div>
        <h1 class="title">Payment Successful!</h1>
        <p class="subtitle">Your subscription has been activated. You can now close this window and return to the app.</p>
        <button class="btn" onclick="window.close()">Close Window</button>
    </div>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
