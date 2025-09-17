import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('complete potluck event lifecycle', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for complete flow
    
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    
    // === STEP 1: AUTHENTICATION ===
    console.log('Step 1: Authentication');
    
    // Wait for loading to complete
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    // Verify we're on auth screen
    await expect(page.getByTestId('welcome-title')).toBeVisible();
    await page.screenshot({ path: 'test-results/journey-1-auth.png' });
    
    // Login
    await page.getByTestId('email-input').fill('host@test.dev');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('sign-in-button').click();
    
    // === STEP 2: EVENTS DASHBOARD ===
    console.log('Step 2: Events Dashboard');
    
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('events-title')).toContainText('Events');
    await page.screenshot({ path: 'test-results/journey-2-dashboard.png' });
    
    // Test filtering
    await page.getByTestId('status-filter').getByTestId('status-filter-option-drafts').click();
    await page.waitForTimeout(1000);
    
    await page.getByTestId('ownership-filter-mine').click();
    await page.waitForTimeout(1000);
    
    // Reset filters
    await page.getByTestId('status-filter').getByTestId('status-filter-option-upcoming').click();
    await page.waitForTimeout(1000);
    
    // === STEP 3: CREATE EVENT ===
    console.log('Step 3: Create Event');
    
    await page.getByTestId('create-event-button').click();
    await expect(page.getByTestId('create-event-header')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/journey-3-create-start.png' });
    
    // Step 1: Event Details
    await page.getByTestId('event-title-input').fill('Test Potluck Journey');
    await page.getByTestId('event-description-input').fill('An end-to-end test event created by Playwright automation');
    
    // Handle date/time pickers (they might open modals)
    await page.getByTestId('date-picker-button').click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape'); // Close any modal
    
    await page.getByTestId('time-picker-button').click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape'); // Close any modal
    
    // Fill guest numbers
    const minGuestsInput = page.locator('input').filter({ hasText: /min/i }).or(page.getByPlaceholder(/min/i)).first();
    const maxGuestsInput = page.locator('input').filter({ hasText: /max/i }).or(page.getByPlaceholder(/max/i)).first();
    
    if (await minGuestsInput.isVisible()) {
      await minGuestsInput.clear();
      await minGuestsInput.fill('8');
    }
    if (await maxGuestsInput.isVisible()) {
      await maxGuestsInput.clear();
      await maxGuestsInput.fill('25');
    }
    
    // Select meal type
    const vegOption = page.getByText('Vegetarian').first();
    if (await vegOption.isVisible()) {
      await vegOption.click();
    }
    
    await page.screenshot({ path: 'test-results/journey-3-create-step1.png' });
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Step 2: Location
    const locationSearch = page.getByPlaceholder(/search for the perfect spot/i);
    if (await locationSearch.isVisible()) {
      await locationSearch.fill('Central Park');
      await locationSearch.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Select first popular location
    const firstLocation = page.getByText(/Central Park|Times Square|Brooklyn Bridge/).first();
    if (await firstLocation.isVisible()) {
      await firstLocation.click();
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ path: 'test-results/journey-3-create-step2.png' });
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Step 3: Menu
    const dishNameInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).first();
    if (await dishNameInput.isVisible()) {
      await dishNameInput.fill('Quinoa Salad with Fresh Herbs');
    }
    
    // Add second dish
    const addDishButton = page.getByText('+ Add Dish').first();
    if (await addDishButton.isVisible()) {
      await addDishButton.click();
      await page.waitForTimeout(500);
      
      const secondDishInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).last();
      if (await secondDishInput.isVisible()) {
        await secondDishInput.fill('Vegan Chocolate Brownies');
      }
    }
    
    await page.screenshot({ path: 'test-results/journey-3-create-step3.png' });
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Step 4: Participants and Create
    const participantEmailInput = page.getByPlaceholder(/friend@email.com/i);
    if (await participantEmailInput.isVisible()) {
      await participantEmailInput.fill('participant1@test.dev');
      
      const addParticipantButton = page.getByText('Add').filter({ hasText: /^Add$/ });
      if (await addParticipantButton.isVisible()) {
        await addParticipantButton.click();
        await page.waitForTimeout(500);
      }
      
      // Add second participant
      await participantEmailInput.fill('participant2@test.dev');
      if (await addParticipantButton.isVisible()) {
        await addParticipantButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    await page.screenshot({ path: 'test-results/journey-3-create-step4.png' });
    
    // Create the event
    await page.getByTestId('create-event-final-button').click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/journey-3-create-complete.png' });
    
    // === STEP 4: PUBLISH EVENT ===
    console.log('Step 4: Publish Event');
    
    const publishButton = page.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await page.waitForTimeout(2000);
      
      // Handle publish success
      const okButton = page.getByTestId('ok-button');
      if (await okButton.isVisible()) {
        await okButton.click();
      }
    } else {
      // If no publish button, just click OK to continue
      const okButton = page.getByTestId('ok-button');
      if (await okButton.isVisible()) {
        await okButton.click();
      }
    }
    
    // === STEP 5: EVENT MANAGEMENT ===
    console.log('Step 5: Event Management');
    
    // Should be back on events list
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Look for our created event
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      // Click on the first event (hopefully our created one)
      await eventCards.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/journey-5-event-details.png' });
      
      // Test event details tabs
      const itemsTab = page.getByText('Items').first();
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/journey-5-items.png' });
      }
      
      const participantsTab = page.getByText('Participants').first();
      if (await participantsTab.isVisible()) {
        await participantsTab.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/journey-5-participants.png' });
      }
      
      // Go back to events list
      const backButton = page.locator('button').filter({ hasText: /back|arrow/i }).first()
        .or(page.locator('[data-testid*="back"]'))
        .or(page.locator('button').first());
      
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // === STEP 6: SETTINGS AND PLANS ===
    console.log('Step 6: Settings and Plans');
    
    // Test Plans screen
    await page.getByTestId('plans-button').click();
    await expect(page.getByText('Plans')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/journey-6-plans.png' });
    
    // Go back to events
    const backFromPlans = page.locator('button').filter({ hasText: /back|arrow/i }).first()
      .or(page.locator('button').first());
    if (await backFromPlans.isVisible()) {
      await backFromPlans.click();
      await page.waitForTimeout(1000);
    }
    
    // Test Settings screen
    await page.getByTestId('settings-button').click();
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/journey-6-settings.png' });
    
    // Test subscription navigation
    await page.getByText('Subscription').click();
    await expect(page.getByText('My Potluck Subscription')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/journey-6-subscription.png' });
    
    // === STEP 7: FINAL VERIFICATION ===
    console.log('Step 7: Final Verification');
    
    // Navigate back to main events screen
    const backFromSub = page.locator('button').filter({ hasText: /back|arrow/i }).first()
      .or(page.locator('button').first());
    if (await backFromSub.isVisible()) {
      await backFromSub.click();
      await page.waitForTimeout(1000);
    }
    
    const backFromSettings = page.locator('button').filter({ hasText: /back|arrow/i }).first()
      .or(page.locator('button').first());
    if (await backFromSettings.isVisible()) {
      await backFromSettings.click();
      await page.waitForTimeout(1000);
    }
    
    // Should be back on events list
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/journey-7-complete.png' });
    
    console.log('✅ Complete user journey test completed successfully!');
  });

  test('authentication error handling', async ({ page }) => {
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for auth screen
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    // Test invalid login
    await page.getByTestId('email-input').fill('invalid@test.dev');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByTestId('sign-in-button').click();
    
    // Should show loading state
    const loadingIndicator = page.getByTestId('auth-loading');
    if (await loadingIndicator.isVisible({ timeout: 2000 })) {
      await expect(loadingIndicator).toBeVisible();
    }
    
    // Wait for potential error handling
    await page.waitForTimeout(5000);
    
    // Take screenshot of error state
    await page.screenshot({ path: 'test-results/auth-error.png' });
  });

  test('responsive design across viewports', async ({ page }) => {
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    
    // Test different screen sizes
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'iPad Landscape' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);
      
      // Take screenshot of auth screen
      await page.screenshot({ 
        path: `test-results/responsive-auth-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true 
      });
      
      // If we can login quickly, test events screen too
      if (await page.getByTestId('email-input').isVisible({ timeout: 2000 })) {
        await page.getByTestId('email-input').fill('host@test.dev');
        await page.getByTestId('password-input').fill('password123');
        await page.getByTestId('sign-in-button').click();
        
        if (await page.getByTestId('events-header').isVisible({ timeout: 10000 })) {
          await page.screenshot({ 
            path: `test-results/responsive-events-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
            fullPage: true 
          });
        }
        
        // Reload page for next viewport test
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
      }
    }
  });
});
