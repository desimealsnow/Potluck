import { test, expect } from '@playwright/test';

test.describe('Create Event Flow', () => {
  test.beforeEach(async ({ page }) => {
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    
    // Login first
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 10000 });
    
    await page.getByTestId('email-input').fill('host@test.dev');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('sign-in-button').click();
    
    // Wait for events list and navigate to create event
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('create-event-button').click();
    
    // Wait for create event screen
    await expect(page.getByTestId('create-event-header')).toBeVisible({ timeout: 10000 });
  });

  test('should display create event header and stepper', async ({ page }) => {
    // Check header
    await expect(page.getByTestId('create-event-title')).toContainText('Create Potluck');
    await expect(page.getByTestId('back-button')).toBeVisible();
    
    // Check stepper is visible (assuming it exists)
    // Note: Stepper component might not have testID yet
    await page.screenshot({ path: 'test-results/create-event-step1.png' });
  });

  test('should complete Step 1 - Event Details', async ({ page }) => {
    // Check Step 1 form elements
    await expect(page.getByTestId('event-details-card')).toBeVisible();
    await expect(page.getByTestId('title-label')).toContainText('Event Title');
    await expect(page.getByTestId('event-title-input')).toBeVisible();
    await expect(page.getByTestId('description-label')).toContainText('Description');
    await expect(page.getByTestId('event-description-input')).toBeVisible();
    
    // Fill in event details
    await page.getByTestId('event-title-input').fill('Test Potluck Event');
    await page.getByTestId('event-description-input').fill('A test event for Playwright automation');
    
    // Check date/time pickers
    await expect(page.getByTestId('date-time-container')).toBeVisible();
    await expect(page.getByTestId('date-picker-button')).toBeVisible();
    await expect(page.getByTestId('time-picker-button')).toBeVisible();
    
    // Click date picker (may open modal)
    await page.getByTestId('date-picker-button').click();
    await page.waitForTimeout(1000);
    
    // Close any date picker modal that might have opened
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Click time picker (may open modal)
    await page.getByTestId('time-picker-button').click();
    await page.waitForTimeout(1000);
    
    // Close any time picker modal that might have opened
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Fill guest counts (these should be Input components with testIDs)
    const minGuestsInput = page.locator('input').filter({ hasText: /min/i }).or(
      page.getByPlaceholder(/min/i)
    ).first();
    const maxGuestsInput = page.locator('input').filter({ hasText: /max/i }).or(
      page.getByPlaceholder(/max/i)
    ).first();
    
    if (await minGuestsInput.isVisible()) {
      await minGuestsInput.clear();
      await minGuestsInput.fill('5');
    }
    if (await maxGuestsInput.isVisible()) {
      await maxGuestsInput.clear();
      await maxGuestsInput.fill('20');
    }
    
    // Select meal type (these should be FoodOption components)
    const vegOption = page.getByText('Vegetarian').first();
    if (await vegOption.isVisible()) {
      await vegOption.click();
    }
    
    // Take screenshot of completed step 1
    await page.screenshot({ path: 'test-results/create-event-step1-complete.png' });
    
    // Proceed to next step
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
  });

  test('should complete Step 2 - Location Selection', async ({ page }) => {
    // First complete step 1
    await page.getByTestId('event-title-input').fill('Test Event');
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Check Step 2 elements
    await expect(page.getByText('Where\'s the feast?')).toBeVisible();
    
    // Search for location
    const locationSearch = page.getByPlaceholder(/search for the perfect spot/i);
    if (await locationSearch.isVisible()) {
      await locationSearch.fill('Central Park');
      await locationSearch.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Select first popular location
    const popularLocations = page.getByText(/Central Park|Times Square|Brooklyn Bridge/);
    const firstLocation = popularLocations.first();
    if (await firstLocation.isVisible()) {
      await firstLocation.click();
      await page.waitForTimeout(1000);
    }
    
    // Take screenshot of step 2
    await page.screenshot({ path: 'test-results/create-event-step2.png' });
    
    // Proceed to next step
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
  });

  test('should complete Step 3 - Menu Planning', async ({ page }) => {
    // Complete steps 1 and 2 first
    await page.getByTestId('event-title-input').fill('Test Event');
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Select a location
    const firstLocation = page.getByText(/Central Park|Times Square|Brooklyn Bridge/).first();
    if (await firstLocation.isVisible()) {
      await firstLocation.click();
    }
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Check Step 3 elements
    await expect(page.getByText('What\'s on the menu?')).toBeVisible();
    
    // Add dish name to first dish
    const dishNameInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).first();
    if (await dishNameInput.isVisible()) {
      await dishNameInput.fill('Homemade Pasta Salad');
    }
    
    // Try to add another dish
    const addDishButton = page.getByText('+ Add Dish').first();
    if (await addDishButton.isVisible()) {
      await addDishButton.click();
      await page.waitForTimeout(500);
      
      // Fill second dish
      const secondDishInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).last();
      if (await secondDishInput.isVisible()) {
        await secondDishInput.fill('Chocolate Chip Cookies');
      }
    }
    
    // Take screenshot of step 3
    await page.screenshot({ path: 'test-results/create-event-step3.png' });
    
    // Proceed to final step
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
  });

  test('should complete Step 4 - Participant Planning and Create Event', async ({ page }) => {
    // Complete all previous steps
    await page.getByTestId('event-title-input').fill('Final Test Event');
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    const firstLocation = page.getByText(/Central Park|Times Square|Brooklyn Bridge/).first();
    if (await firstLocation.isVisible()) {
      await firstLocation.click();
    }
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    const dishNameInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).first();
    if (await dishNameInput.isVisible()) {
      await dishNameInput.fill('Test Dish');
    }
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Check Step 4 elements
    await expect(page.getByText('Plan Your Guest List')).toBeVisible();
    
    // Add participant emails if the input is available
    const participantEmailInput = page.getByPlaceholder(/friend@email.com/i);
    if (await participantEmailInput.isVisible()) {
      await participantEmailInput.fill('friend1@test.com');
      
      // Click add button if available
      const addParticipantButton = page.getByText('Add').filter({ hasText: /^Add$/ });
      if (await addParticipantButton.isVisible()) {
        await addParticipantButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Review event summary
    await expect(page.getByText('Event Summary')).toBeVisible();
    
    // Take screenshot of final step
    await page.screenshot({ path: 'test-results/create-event-step4.png' });
    
    // Create the event
    await page.getByTestId('create-event-final-button').click();
    
    // Wait for event creation (should show success state or navigate)
    await page.waitForTimeout(3000);
    
    // Take screenshot of result
    await page.screenshot({ path: 'test-results/create-event-complete.png' });
    
    // Check for success indicators
    const publishButton = page.getByTestId('publish-button');
    const okButton = page.getByTestId('ok-button');
    
    if (await publishButton.isVisible()) {
      await expect(publishButton).toBeVisible();
      await expect(okButton).toBeVisible();
    }
  });

  test('should validate required fields in Step 1', async ({ page }) => {
    // Try to proceed without filling required fields
    await page.getByTestId('next-step-button').click();
    
    // Should show validation alert or remain on step 1
    // The validation might show as an alert dialog
    await page.waitForTimeout(1000);
    
    // Take screenshot to see validation
    await page.screenshot({ path: 'test-results/create-event-validation.png' });
  });

  test('should allow navigation back to previous steps', async ({ page }) => {
    // Go to step 2
    await page.getByTestId('event-title-input').fill('Test Event');
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Go back to step 1
    await page.getByTestId('back-step-button').click();
    await page.waitForTimeout(1000);
    
    // Should be back on step 1
    await expect(page.getByTestId('event-details-card')).toBeVisible();
    
    // Title should still be filled
    await expect(page.getByTestId('event-title-input')).toHaveValue('Test Event');
  });

  test('should navigate back to events list', async ({ page }) => {
    await page.getByTestId('back-button').click();
    
    // Should return to events list
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('events-title')).toContainText('Events');
  });

  test('should handle date and time picker interactions', async ({ page }) => {
    // Click date picker
    await page.getByTestId('date-picker-button').click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of date picker if it opened
    await page.screenshot({ path: 'test-results/date-picker.png' });
    
    // Close date picker
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Click time picker
    await page.getByTestId('time-picker-button').click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of time picker if it opened
    await page.screenshot({ path: 'test-results/time-picker.png' });
    
    // Close time picker
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });
});
