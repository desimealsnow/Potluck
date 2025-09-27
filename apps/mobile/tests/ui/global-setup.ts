import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Check if the mobile app is running
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    const baseURL = config.projects[0].use?.baseURL || 'http://localhost:8081';
    console.log(`📱 Checking if mobile app is running at ${baseURL}...`);
    
    await page.goto(baseURL, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for the app to load
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    console.log('✅ Mobile app is running and ready for testing');
    
    // Take a screenshot of the initial state
    await page.screenshot({ path: 'test-results/global-setup-initial-state.png' });
    
  } catch (error) {
    console.error('❌ Mobile app is not running or not accessible');
    console.error('Please ensure the mobile app is running on the configured port');
    console.error('Error:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('🎯 Global test setup completed successfully');
}

export default globalSetup;