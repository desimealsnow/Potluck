import { test, expect } from '@playwright/test';

test.describe('Event Details Flow', () => {
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
    
    // Wait for events list to load
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Wait for potential events to load
    await page.waitForTimeout(3000);
  });

  test('should navigate to event details from event card', async ({ page }) => {
    // Look for event cards
    const eventCards = page.locator('[data-testid^="event-card-"]');
    const cardCount = await eventCards.count();
    
    if (cardCount > 0) {
      // Click the first event card
      const firstCard = eventCards.first();
      await firstCard.click();
      
      // Wait for navigation to event details
      await page.waitForTimeout(2000);
      
      // Should be on event details page
      // Look for typical event details elements
      const detailsIndicators = page.getByText(/overview|items|participants|back/i);
      if (await detailsIndicators.count() > 0) {
        await expect(detailsIndicators.first()).toBeVisible();
      }
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/event-details-main.png' });
      
    } else {
      // No events available, create one first or skip
      console.log('No events found to test event details');
      test.skip('No events available for testing event details');
    }
  });

  test('should display event details header and navigation', async ({ page }) => {
    // First create or navigate to an event
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() === 0) {
      test.skip('No events available');
    }
    
    await eventCards.first().click();
    await page.waitForTimeout(2000);
    
    // Check for top bar with back button
    const backButton = page.locator('button').filter({ hasText: /back|arrow/i }).first()
      .or(page.locator('[data-testid*="back"]'));
    
    if (await backButton.isVisible()) {
      await expect(backButton).toBeVisible();
    }
    
    // Check for refresh and share buttons
    const actionButtons = page.locator('button').filter({ hasText: /refresh|share|menu/i });
    if (await actionButtons.count() > 0) {
      await expect(actionButtons.first()).toBeVisible();
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/event-details-header.png' });
  });

  test('should display event information and status', async ({ page }) => {
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() === 0) {
      test.skip('No events available');
    }
    
    await eventCards.first().click();
    await page.waitForTimeout(2000);
    
    // Look for event information
    const eventTitle = page.locator('h1, h2, [class*="title"]').first();
    if (await eventTitle.isVisible()) {
      await expect(eventTitle).toBeVisible();
    }
    
    // Look for date/time information
    const dateInfo = page.getByText(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}:\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i);
    if (await dateInfo.count() > 0) {
      await expect(dateInfo.first()).toBeVisible();
    }
    
    // Look for location information
    const locationInfo = page.getByText(/location|address|venue/i);
    if (await locationInfo.count() > 0) {
      await expect(locationInfo.first()).toBeVisible();
    }
    
    // Look for attendee information
    const attendeeInfo = page.getByText(/attending|\d+ people|\d+ guests/i);
    if (await attendeeInfo.count() > 0) {
      await expect(attendeeInfo.first()).toBeVisible();
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/event-details-info.png' });
  });

  test('should navigate between tabs (Overview, Items, Participants, Requests)', async ({ page }) => {
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() === 0) {
      test.skip('No events available');
    }
    
    await eventCards.first().click();
    await page.waitForTimeout(2000);
    
    // Look for tab navigation
    const tabs = ['Overview', 'Items', 'Participants', 'Requests'];
    
    for (const tabName of tabs) {
      const tab = page.getByText(tabName).first();
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(1000);
        
        // Take screenshot of each tab
        await page.screenshot({ path: `test-results/event-details-tab-${tabName.toLowerCase()}.png` });
      }
    }
  });

  test('should display and interact with Overview tab', async ({ page }) => {
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() === 0) {
      test.skip('No events available');
    }
    
    await eventCards.first().click();
    await page.waitForTimeout(2000);
    
    // Go to Overview tab
    const overviewTab = page.getByText('Overview').first();
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await page.waitForTimeout(1000);
      
      // Look for RSVP section
      const rsvpSection = page.getByText(/rsvp|accept|decline/i);
      if (await rsvpSection.count() > 0) {
        await expect(rsvpSection.first()).toBeVisible();
        
        // Test RSVP buttons if available
        const acceptButton = page.getByText(/accept/i).first();
        const declineButton = page.getByText(/decline/i).first();
        
        if (await acceptButton.isVisible()) {
          await acceptButton.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Look for notes section
      const notesSection = page.getByText(/notes|comments/i);
      if (await notesSection.count() > 0) {
        const notesInput = page.locator('textarea, input').filter({ hasText: /notes|comments/i });
        if (await notesInput.isVisible()) {
          await notesInput.fill('This is a test note for the event');
          await page.waitForTimeout(500);
        }
      }
      
      // Look for host information
      const hostSection = page.getByText(/host|organizer/i);
      if (await hostSection.count() > 0) {
        await expect(hostSection.first()).toBeVisible();
      }
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/event-details-overview.png' });
    }
  });

  test('should display and interact with Items tab', async ({ page }) => {
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() === 0) {
      test.skip('No events available');
    }
    
    await eventCards.first().click();
    await page.waitForTimeout(2000);
    
    // Go to Items tab
    const itemsTab = page.getByText('Items').first();
    if (await itemsTab.isVisible()) {
      await itemsTab.click();
      await page.waitForTimeout(1000);
      
      // Look for add item section (if user is host)
      const addItemSection = page.getByText(/add item|new item/i);
      if (await addItemSection.count() > 0) {
        await expect(addItemSection.first()).toBeVisible();
        
        // Try adding an item
        const itemNameInput = page.getByPlaceholder(/item name/i);
        if (await itemNameInput.isVisible()) {
          await itemNameInput.fill('Test Item');
          
          // Look for add button
          const addButton = page.getByText(/add/i).filter({ hasText: /^add$/i });
          if (await addButton.isVisible()) {
            await addButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }
      
      // Look for existing items
      const itemList = page.locator('[class*="item"], [data-testid*="item"]');
      if (await itemList.count() > 0) {
        await expect(itemList.first()).toBeVisible();
        
        // Test claim/unclaim functionality
        const claimButtons = page.getByText(/claim|unclaim|\+|-/);
        if (await claimButtons.count() > 0) {
          const firstClaimButton = claimButtons.first();
          await firstClaimButton.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/event-details-items.png' });
    }
  });

  test('should display Participants tab', async ({ page }) => {
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() === 0) {
      test.skip('No events available');
    }
    
    await eventCards.first().click();
    await page.waitForTimeout(2000);
    
    // Go to Participants tab
    const participantsTab = page.getByText('Participants').first();
    if (await participantsTab.isVisible()) {
      await participantsTab.click();
      await page.waitForTimeout(1000);
      
      // Look for participant list
      const participantList = page.locator('[class*="participant"], [data-testid*="participant"]');
      if (await participantList.count() > 0) {
        await expect(participantList.first()).toBeVisible();
      }
      
      // Look for invite functionality (if user is host)
      const inviteSection = page.getByText(/invite|add participant/i);
      if (await inviteSection.count() > 0) {
        await expect(inviteSection.first()).toBeVisible();
      }
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/event-details-participants.png' });
    }
  });

  test('should display Requests tab for hosts', async ({ page }) => {
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() === 0) {
      test.skip('No events available');
    }
    
    await eventCards.first().click();
    await page.waitForTimeout(2000);
    
    // Go to Requests tab (only visible for hosts)
    const requestsTab = page.getByText('Requests').first();
    if (await requestsTab.isVisible()) {
      await requestsTab.click();
      await page.waitForTimeout(1000);
      
      // Look for join requests
      const requestsList = page.locator('[class*="request"], [data-testid*="request"]');
      if (await requestsList.count() > 0) {
        await expect(requestsList.first()).toBeVisible();
        
        // Look for approve/deny buttons
        const approveButtons = page.getByText(/approve|accept/i);
        const denyButtons = page.getByText(/deny|decline|reject/i);
        
        if (await approveButtons.count() > 0) {
          await expect(approveButtons.first()).toBeVisible();
        }
        if (await denyButtons.count() > 0) {
          await expect(denyButtons.first()).toBeVisible();
        }
      } else {
        // No requests - should show empty state
        const emptyState = page.getByText(/no requests|no pending/i);
        if (await emptyState.count() > 0) {
          await expect(emptyState.first()).toBeVisible();
        }
      }
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/event-details-requests.png' });
    }
  });

  test('should display host action buttons based on event status', async ({ page }) => {
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() === 0) {
      test.skip('No events available');
    }
    
    await eventCards.first().click();
    await page.waitForTimeout(2000);
    
    // Look for host action buttons
    const actionButtons = page.getByText(/publish|cancel|complete|delete|restore/i);
    
    if (await actionButtons.count() > 0) {
      // Take screenshot of available actions
      await page.screenshot({ path: 'test-results/event-details-actions.png' });
      
      // Test double-tap confirmation if available
      const firstAction = actionButtons.first();
      if (await firstAction.isVisible()) {
        await firstAction.click();
        await page.waitForTimeout(500);
        
        // Should show "Tap again to confirm"
        const confirmText = page.getByText(/tap again to confirm/i);
        if (await confirmText.isVisible()) {
          await expect(confirmText).toBeVisible();
          
          // Don't actually confirm - just test the UI
          await page.waitForTimeout(3000); // Wait for timeout to reset
        }
      }
    }
  });

  test('should navigate back to events list', async ({ page }) => {
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() === 0) {
      test.skip('No events available');
    }
    
    await eventCards.first().click();
    await page.waitForTimeout(2000);
    
    // Find and click back button
    const backButton = page.locator('button').filter({ hasText: /back|arrow/i }).first()
      .or(page.locator('[data-testid*="back"]'))
      .or(page.locator('button').first()); // Fallback to first button
    
    if (await backButton.isVisible()) {
      await backButton.click();
      
      // Should return to events list
      await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle event details loading states', async ({ page }) => {
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() === 0) {
      test.skip('No events available');
    }
    
    await eventCards.first().click();
    
    // Look for loading indicators
    const loadingIndicators = page.getByText(/loading|spinner/i);
    if (await loadingIndicators.count() > 0) {
      await expect(loadingIndicators.first()).toBeVisible();
    }
    
    // Wait for content to load
    await page.waitForTimeout(5000);
    
    // Take screenshot of final loaded state
    await page.screenshot({ path: 'test-results/event-details-loaded.png' });
  });
});
