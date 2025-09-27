import { test, expect } from '@playwright/test';
import { loginAsHost, createAndPublishEvent } from './event-test-utilities';

test.describe('Complete User Journey', () => {
  test('complete potluck event lifecycle', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for complete flow
    
    // === STEP 1: AUTHENTICATION ===
    console.log('Step 1: Authentication');
    
    // Navigate to the app
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for loading to complete
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 10000 });
    
    await loginAsHost(page);
    await page.screenshot({ path: 'test-results/journey-1-login.png' });
    
    // === STEP 2: EVENTS DASHBOARD ===
    console.log('Step 2: Events Dashboard');
    await expect(page.getByTestId('events-title')).toContainText('Events');
    await page.screenshot({ path: 'test-results/journey-2-dashboard.png' });
    
    // Test filtering - first open the filters
    await page.getByTestId('filter-toggle-button').click();
    await page.waitForTimeout(1000);
    
    await page.getByTestId('status-filter').getByTestId('status-filter-option-drafts').click();
    await page.waitForTimeout(1000);
    
    await page.getByTestId('ownership-mine').click();
    await page.waitForTimeout(1000);
    
    // Reset filters
    await page.getByTestId('status-filter').getByTestId('status-filter-option-upcoming').click();
    await page.waitForTimeout(1000);
    
    // === STEP 3: CREATE AND PUBLISH EVENT ===
    console.log('Step 3: Create and Publish Event');
    
    // Use reusable utility for event creation and publishing
    const eventId = await createAndPublishEvent(page, 'Test Potluck Journey', 'An end-to-end test event created by Playwright automation', '8', '25');
    
    // Handle any final popups that might appear
    const finalOkButton = page.getByText('OK');
    if (await finalOkButton.isVisible()) {
      console.log('Dismissing final popup...');
      await finalOkButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ path: 'test-results/journey-3-create-complete.png' });
    
    // === STEP 4: EVENT MANAGEMENT ===
    console.log('Step 4: Event Management');
    
    // Check if we're on event details page or events list
    const eventsHeader = page.getByTestId('events-header');
    const eventHeader = page.getByTestId('event-header');
    
    const isOnEventsList = await eventsHeader.isVisible();
    const isOnEventDetails = await eventHeader.isVisible();
    
    if (isOnEventDetails) {
      console.log('Currently on event details page, navigating back to events list...');
      const backButton = page.getByTestId('back-button');
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Should now be on events list
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Look for our created event
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      // Click on the first event (hopefully our created one)
      await eventCards.first().click();
      await page.waitForTimeout(2000);
      
      // Verify we're on event details page
      await expect(page.getByTestId('event-header')).toBeVisible();
      await page.screenshot({ path: 'test-results/journey-4-event-details.png' });
      
      // Test event actions
      const publishButton = page.getByTestId('action-button-publish');
      if (await publishButton.isVisible()) {
        await publishButton.click();
        await page.waitForTimeout(1000);
        
        // Handle publish confirmation
        const confirmText = page.getByText(/tap again to confirm/i);
        if (await confirmText.isVisible()) {
          await publishButton.click(); // Confirm publish
          await page.waitForTimeout(2000);
        }
        
        // Handle success message
        const okButton = page.getByTestId('ok-button');
        if (await okButton.isVisible()) {
          await okButton.click();
        }
      }
      
      // Test navigation back
      const backButton = page.getByTestId('back-button');
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // === STEP 5: VERIFICATION ===
    console.log('Step 5: Verification');
    
    // Should be back on events list
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/journey-5-final-dashboard.png' });
    
    console.log('✅ Complete user journey test completed successfully!');
  });

  test('authentication error handling', async ({ page }) => {
    // Test invalid login credentials
    await page.goto(process.env.MOBILE_WEB_URL || 'http://localhost:8081/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for loading to complete
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 10000 });
    
    // Try invalid credentials
    await page.getByTestId('email-input').fill('invalid@example.com');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByTestId('sign-in-button').click();
    
    // Should show error or stay on login page
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('email-input')).toBeVisible();
    
    console.log('✅ Authentication error handling test completed!');
  });

  test('responsive design across viewports', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsHost(page);
    await expect(page.getByTestId('events-title')).toBeVisible();
    await page.screenshot({ path: 'test-results/responsive-mobile.png' });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('events-title')).toBeVisible();
    await page.screenshot({ path: 'test-results/responsive-tablet.png' });
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('events-title')).toBeVisible();
    await page.screenshot({ path: 'test-results/responsive-desktop.png' });
    
    console.log('✅ Responsive design test completed!');
  });
});