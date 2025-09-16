import { test, expect } from '@playwright/test';

test.describe('Test Setup Validation', () => {
  test('should validate Playwright configuration', async ({ page }) => {
    // Test that Playwright can start without connecting to the app
    const userAgent = await page.evaluate(() => navigator.userAgent);
    expect(userAgent).toContain('Chrome');
    
    console.log('✅ Playwright is working correctly');
    console.log('✅ Chrome browser is available');
    console.log(`✅ User Agent: ${userAgent}`);
  });

  test('should validate test directory structure', async () => {
    // This test runs without a page to validate our test setup
    const fs = require('fs');
    const path = require('path');
    
    const testDir = path.join(__dirname);
    const configPath = path.join(__dirname, '../../playwright.config.ts');
    
    expect(fs.existsSync(testDir)).toBe(true);
    expect(fs.existsSync(configPath)).toBe(true);
    
    console.log('✅ Test directory structure is correct');
    console.log('✅ Playwright config exists');
  });

  test('should validate that mobile web server is required', async ({ page }) => {
    // This test demonstrates the connection requirement
    test.setTimeout(10000);
    
    try {
      await page.goto('http://localhost:8081/', { timeout: 5000 });
      console.log('✅ Mobile web server is running');
      await expect(page.locator('body')).toBeVisible();
    } catch (error) {
      console.log('❌ Mobile web server is not running on localhost:8081');
      console.log('📝 To run full tests, start the server with: npm run web');
      console.log('🔍 Expected error (server not running):', error.message);
      
      // This is expected when server isn't running
      expect(error.message).toContain('ERR_CONNECTION_REFUSED');
    }
  });
});