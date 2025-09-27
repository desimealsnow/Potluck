import { test, expect } from '@playwright/test';

test.describe('Console Debug Test', () => {
  test('check console errors and page loading', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];
    
    // Listen to console messages
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Listen to page errors
    page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`);
    });
    
    // Listen to network errors
    page.on('response', response => {
      if (!response.ok()) {
        errors.push(`Network error: ${response.status()} ${response.url()}`);
      }
    });
    
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    console.log('Navigating to:', url);
    
    await page.goto(url);
    console.log('Page loaded, waiting for domcontentloaded...');
    
    await page.waitForLoadState('domcontentloaded');
    console.log('DOM content loaded');
    
    // Wait a bit more for React to load
    await page.waitForTimeout(5000);
    
    // Check if React has loaded
    const reactLoaded = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             typeof window.React !== 'undefined' || 
             document.querySelector('#root')?.children.length > 0;
    });
    
    console.log('React loaded:', reactLoaded);
    
    // Get the root element content
    const rootContent = await page.evaluate(() => {
      const root = document.querySelector('#root');
      return root ? root.innerHTML : 'No root element found';
    });
    
    console.log('Root content (first 500 chars):', rootContent.substring(0, 500));
    
    // Check for any script tags
    const scriptTags = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      return Array.from(scripts).map(script => ({
        src: script.src,
        type: script.type,
        hasContent: script.innerHTML.length > 0
      }));
    });
    
    console.log('Script tags:', scriptTags);
    
    // Log all console messages
    console.log('Console messages:', consoleMessages);
    console.log('Errors:', errors);
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/console-debug.png' });
    
    // The test should pass even if there are errors, we just want to see them
    expect(true).toBe(true);
  });
});

