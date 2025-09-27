import { test, expect } from '@playwright/test';

test.describe('Debug Test', () => {
  test('debug page elements', async ({ page }) => {
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for loading to complete
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/debug-page.png' });
    
    // Get all elements with testID
    const elementsWithTestId = await page.locator('[data-testid]').all();
    console.log('Elements with testID:', elementsWithTestId.length);
    
    for (let i = 0; i < elementsWithTestId.length; i++) {
      const testId = await elementsWithTestId[i].getAttribute('data-testid');
      const tagName = await elementsWithTestId[i].evaluate(el => el.tagName);
      console.log(`Element ${i + 1}: ${tagName} with testID="${testId}"`);
    }
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get all text content
    const bodyText = await page.textContent('body');
    console.log('Body text (first 500 chars):', bodyText?.substring(0, 500));
    
    // Check if we're on the auth screen or events screen
    const authContainer = page.getByTestId('auth-container');
    const eventsHeader = page.getByTestId('events-header');
    
    console.log('Auth container visible:', await authContainer.isVisible());
    console.log('Events header visible:', await eventsHeader.isVisible());
    
    // If auth container is visible, check its contents
    if (await authContainer.isVisible()) {
      const authForm = page.getByTestId('auth-form-container');
      const welcomeTitle = page.getByTestId('welcome-title');
      const emailInput = page.getByTestId('email-input');
      
      console.log('Auth form visible:', await authForm.isVisible());
      console.log('Welcome title visible:', await welcomeTitle.isVisible());
      console.log('Email input visible:', await emailInput.isVisible());
    }
  });
});
