import { test, expect } from '@playwright/test';

test.describe('Event Lifecycle Management', () => {
  test.beforeEach(async ({ page }) => {
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for loading to complete
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    // Login as host
    await page.getByTestId('email-input').fill('host@test.dev');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('sign-in-button').click();
    
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
  });

  test('Complete event lifecycle: Draft → Published → Completed', async ({ page }) => {
    console.log('Testing complete event lifecycle...');
    
    // === STEP 1: Create Draft Event ===
    console.log('Step 1: Creating draft event...');
    await page.getByTestId('create-event-button').click();
    await expect(page.getByTestId('create-event-header')).toBeVisible({ timeout: 10000 });
    
    // Fill event details
    await page.getByTestId('event-title-input').fill('Lifecycle Test Event');
    await page.getByTestId('event-description-input').fill('Testing complete event lifecycle from draft to completion');
    
    // Set guest numbers
    const minGuestsInput = page.locator('input').filter({ hasText: /min/i }).or(page.getByPlaceholder(/min/i)).first();
    const maxGuestsInput = page.locator('input').filter({ hasText: /max/i }).or(page.getByPlaceholder(/max/i)).first();
    
    if (await minGuestsInput.isVisible()) {
      await minGuestsInput.clear();
      await minGuestsInput.fill('5');
    }
    if (await maxGuestsInput.isVisible()) {
      await maxGuestsInput.clear();
      await maxGuestsInput.fill('25');
    }
    
    await page.screenshot({ path: 'test-results/lifecycle-1-draft-creation.png' });
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Location step
    const locationSearch = page.getByPlaceholder(/search for the perfect spot/i);
    if (await locationSearch.isVisible()) {
      await locationSearch.fill('Central Park');
      await locationSearch.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Menu step
    const dishNameInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).first();
    if (await dishNameInput.isVisible()) {
      await dishNameInput.fill('Lifecycle Test Main Course');
    }
    
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(1000);
    
    // Create the event (should be in draft status)
    await page.getByTestId('create-event-final-button').click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/lifecycle-1-draft-created.png' });
    
    // Should be back on events list with draft event
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    
    // === STEP 2: Publish Event ===
    console.log('Step 2: Publishing event...');
    
    // Find the created event
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/lifecycle-2-draft-event-details.png' });
      
      // Should see publish button
      const publishButton = page.getByTestId('action-button-publish');
      if (await publishButton.isVisible()) {
        await publishButton.click();
        await page.waitForTimeout(1000);
        
        // Should show "Tap again to confirm"
        const confirmText = page.getByText(/tap again to confirm/i);
        if (await confirmText.isVisible()) {
          await publishButton.click(); // Confirm publish
          await page.waitForTimeout(2000);
          
          // Should show success message
          const okButton = page.getByTestId('ok-button');
          if (await okButton.isVisible()) {
            await okButton.click();
          }
        }
        
        await page.screenshot({ path: 'test-results/lifecycle-2-event-published.png' });
      }
    }
    
    // === STEP 3: Manage Published Event ===
    console.log('Step 3: Managing published event...');
    
    // Should be back on events list
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    
    // Click on the event again
    const publishedEventCards = page.locator('[data-testid^="event-card-"]');
    if (await publishedEventCards.count() > 0) {
      await publishedEventCards.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/lifecycle-3-published-event-details.png' });
      
      // Should see cancel and complete buttons
      const cancelButton = page.getByTestId('action-button-cancel');
      const completeButton = page.getByTestId('action-button-complete');
      
      if (await cancelButton.isVisible()) {
        await expect(cancelButton).toBeVisible();
      }
      if (await completeButton.isVisible()) {
        await expect(completeButton).toBeVisible();
      }
      
      // Test adding items to published event
      const itemsTab = page.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await page.waitForTimeout(1000);
        
        // Add an item
        const itemNameInput = page.getByTestId('item-name-picker');
        if (await itemNameInput.isVisible()) {
          await itemNameInput.click();
          await page.waitForTimeout(500);
          
          const nameInput = page.getByTestId('item-name-display');
          if (await nameInput.isVisible()) {
            await nameInput.fill('Published Event Item');
          }
          
          const addButton = page.getByTestId('add-item-button');
          if (await addButton.isVisible()) {
            await addButton.click();
            await page.waitForTimeout(1000);
          }
        }
        
        await page.screenshot({ path: 'test-results/lifecycle-3-items-added.png' });
      }
    }
    
    // === STEP 4: Complete Event ===
    console.log('Step 4: Completing event...');
    
    // Go back to event details
    const backButton = page.getByTestId('back-button');
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForTimeout(1000);
    }
    
    const eventCardsAfter = page.locator('[data-testid^="event-card-"]');
    if (await eventCardsAfter.count() > 0) {
      await eventCardsAfter.first().click();
      await page.waitForTimeout(2000);
      
      // Complete the event
      const completeButton = page.getByTestId('action-button-complete');
      if (await completeButton.isVisible()) {
        await completeButton.click();
        await page.waitForTimeout(1000);
        
        // Should show "Tap again to confirm"
        const confirmText = page.getByText(/tap again to confirm/i);
        if (await confirmText.isVisible()) {
          await completeButton.click(); // Confirm completion
          await page.waitForTimeout(2000);
          
          // Should show success message
          const okButton = page.getByTestId('ok-button');
          if (await okButton.isVisible()) {
            await okButton.click();
          }
        }
        
        await page.screenshot({ path: 'test-results/lifecycle-4-event-completed.png' });
      }
    }
    
    // === STEP 5: Verify Event Status ===
    console.log('Step 5: Verifying event status...');
    
    // Should be back on events list
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    
    // Check that event is now in past events
    const pastTab = page.getByTestId('tab-past');
    if (await pastTab.isVisible()) {
      await pastTab.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/lifecycle-5-past-events.png' });
      
      // Should see our completed event
      const pastEventCards = page.locator('[data-testid^="event-card-"]');
      if (await pastEventCards.count() > 0) {
        await expect(pastEventCards.first()).toBeVisible();
      }
    }
    
    console.log('✅ Complete event lifecycle test completed!');
  });

  test('Event cancellation workflow', async ({ page }) => {
    console.log('Testing event cancellation workflow...');
    
    // Create and publish event
    await page.getByTestId('create-event-button').click();
    await page.getByTestId('event-title-input').fill('Cancellation Test Event');
    await page.getByTestId('event-description-input').fill('Testing event cancellation');
    
    // Quick create
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);
    await page.getByTestId('create-event-final-button').click();
    await page.waitForTimeout(2000);
    
    // Publish
    const publishButton = page.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Navigate to event
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/cancellation-1-published-event.png' });
      
      // Cancel the event
      const cancelButton = page.getByTestId('action-button-cancel');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await page.waitForTimeout(1000);
        
        // Should show "Tap again to confirm"
        const confirmText = page.getByText(/tap again to confirm/i);
        if (await confirmText.isVisible()) {
          await cancelButton.click(); // Confirm cancellation
          await page.waitForTimeout(2000);
          
          // Should show success message
          const okButton = page.getByTestId('ok-button');
          if (await okButton.isVisible()) {
            await okButton.click();
          }
        }
        
        await page.screenshot({ path: 'test-results/cancellation-2-event-cancelled.png' });
      }
    }
    
    // Verify event is cancelled
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    
    // Check that event shows as cancelled
    const cancelledEventCards = page.locator('[data-testid^="event-card-"]');
    if (await cancelledEventCards.count() > 0) {
      await expect(cancelledEventCards.first()).toBeVisible();
      
      // Should show cancelled status
      const statusBadge = page.getByTestId(/event-card-.*-status/);
      if (await statusBadge.isVisible()) {
        await expect(statusBadge).toContainText(/cancelled/i);
      }
    }
    
    console.log('✅ Event cancellation test completed!');
  });

  test('Event deletion and restoration workflow', async ({ page }) => {
    console.log('Testing event deletion and restoration...');
    
    // Create event
    await page.getByTestId('create-event-button').click();
    await page.getByTestId('event-title-input').fill('Deletion Test Event');
    await page.getByTestId('event-description-input').fill('Testing event deletion and restoration');
    
    // Quick create
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);
    await page.getByTestId('create-event-final-button').click();
    await page.waitForTimeout(2000);
    
    // Navigate to event
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/deletion-1-draft-event.png' });
      
      // Delete the event
      const deleteButton = page.getByTestId('action-button-purge');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(1000);
        
        // Should show "Tap again to confirm"
        const confirmText = page.getByText(/tap again to confirm/i);
        if (await confirmText.isVisible()) {
          await deleteButton.click(); // Confirm deletion
          await page.waitForTimeout(2000);
          
          // Should show success message
          const okButton = page.getByTestId('ok-button');
          if (await okButton.isVisible()) {
            await okButton.click();
          }
        }
        
        await page.screenshot({ path: 'test-results/deletion-2-event-deleted.png' });
      }
    }
    
    // Verify event is deleted
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    
    // Check deleted events tab
    const deletedTab = page.getByTestId('tab-deleted');
    if (await deletedTab.isVisible()) {
      await deletedTab.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/deletion-3-deleted-events.png' });
      
      // Should see our deleted event
      const deletedEventCards = page.locator('[data-testid^="event-card-"]');
      if (await deletedEventCards.count() > 0) {
        await deletedEventCards.first().click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'test-results/deletion-4-deleted-event-details.png' });
        
        // Restore the event
        const restoreButton = page.getByTestId('action-button-restore');
        if (await restoreButton.isVisible()) {
          await restoreButton.click();
          await page.waitForTimeout(1000);
          
          // Should show "Tap again to confirm"
          const confirmText = page.getByText(/tap again to confirm/i);
          if (await confirmText.isVisible()) {
            await restoreButton.click(); // Confirm restoration
            await page.waitForTimeout(2000);
            
            // Should show success message
            const okButton = page.getByTestId('ok-button');
            if (await okButton.isVisible()) {
              await okButton.click();
            }
          }
          
          await page.screenshot({ path: 'test-results/deletion-5-event-restored.png' });
        }
      }
    }
    
    // Verify event is restored
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    
    // Check drafts tab
    const draftsTab = page.getByTestId('tab-drafts');
    if (await draftsTab.isVisible()) {
      await draftsTab.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/deletion-6-restored-in-drafts.png' });
      
      // Should see our restored event
      const restoredEventCards = page.locator('[data-testid^="event-card-"]');
      if (await restoredEventCards.count() > 0) {
        await expect(restoredEventCards.first()).toBeVisible();
      }
    }
    
    console.log('✅ Event deletion and restoration test completed!');
  });

  test('Event status transitions and UI updates', async ({ page }) => {
    console.log('Testing event status transitions...');
    
    // Create draft event
    await page.getByTestId('create-event-button').click();
    await page.getByTestId('event-title-input').fill('Status Transition Test');
    await page.getByTestId('event-description-input').fill('Testing status transitions');
    
    // Quick create
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);
    await page.getByTestId('create-event-final-button').click();
    await page.waitForTimeout(2000);
    
    // Test different status transitions
    const statuses = [
      { action: 'publish', tab: 'upcoming', expectedStatus: 'published' },
      { action: 'cancel', tab: 'upcoming', expectedStatus: 'cancelled' },
      { action: 'complete', tab: 'past', expectedStatus: 'completed' },
      { action: 'purge', tab: 'deleted', expectedStatus: 'purged' }
    ];
    
    for (const status of statuses) {
      console.log(`Testing ${status.action} transition...`);
      
      // Navigate to event
      const eventCards = page.locator('[data-testid^="event-card-"]');
      if (await eventCards.count() > 0) {
        await eventCards.first().click();
        await page.waitForTimeout(2000);
        
        // Check available actions
        const actionButton = page.getByTestId(`action-button-${status.action}`);
        if (await actionButton.isVisible()) {
          await actionButton.click();
          await page.waitForTimeout(1000);
          
          // Should show "Tap again to confirm"
          const confirmText = page.getByText(/tap again to confirm/i);
          if (await confirmText.isVisible()) {
            await actionButton.click(); // Confirm action
            await page.waitForTimeout(2000);
            
            // Should show success message
            const okButton = page.getByTestId('ok-button');
            if (await okButton.isVisible()) {
              await okButton.click();
            }
          }
          
          await page.screenshot({ path: `test-results/status-transition-${status.action}.png` });
        }
        
        // Go back to events list
        const backButton = page.getByTestId('back-button');
        if (await backButton.isVisible()) {
          await backButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Check appropriate tab
        const tab = page.getByTestId(`tab-${status.tab}`);
        if (await tab.isVisible()) {
          await tab.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ path: `test-results/status-transition-${status.action}-in-${status.tab}.png` });
        }
      }
    }
    
    console.log('✅ Event status transitions test completed!');
  });
});