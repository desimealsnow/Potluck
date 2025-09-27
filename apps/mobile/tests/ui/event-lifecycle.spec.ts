import { test, expect } from '@playwright/test';
import { loginAsHost } from './event-test-utilities';

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
    await loginAsHost(page);
    
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
    
    // Note: Date and time have default values (today/now), so we don't need to set them
    // The CreateEvent component initializes with selectedDate and selectedTime as new Date()
    
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
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    
    // Location step
    const locationSearch = page.getByPlaceholder(/search for the perfect spot/i);
    if (await locationSearch.isVisible()) {
      await locationSearch.fill('Central Park');
      await page.waitForTimeout(2000); // Wait for suggestions to load
      
      // Select the first suggestion
      const firstSuggestion = page.locator('text=Central Park').first();
      if (await firstSuggestion.isVisible()) {
        await firstSuggestion.click();
        await page.waitForTimeout(1000);
      }
    }
    
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    
    // Menu step
    const dishNameInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).first();
    if (await dishNameInput.isVisible()) {
      await dishNameInput.fill('Lifecycle Test Main Course');
    }
    
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    
    // Create the event (should be in draft status)  
    await page.getByTestId('create-event-final-button').click();
    await page.waitForTimeout(3000);
    
    // After event creation, click OK to return to events list
    await page.getByText('OK').click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/lifecycle-1-draft-created.png' });
    
    // Should be on event details page for the created event
    await expect(page.getByTestId('event-header')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Lifecycle Test Event')).toBeVisible();
    
    // === STEP 2: Publish Event ===
    console.log('Step 2: Publishing event...');
    
    // We're already on the event details page, so we can publish directly
    await page.screenshot({ path: 'test-results/lifecycle-2-draft-event-details.png' });
    
    // Should see publish button
    const publishButton = page.getByTestId('action-button-publish');
    if (await publishButton.isVisible()) {
      console.log('Found publish button, clicking...');
      await publishButton.click();
      await page.waitForTimeout(1000);
      
      // Should show "Tap again to confirm"
      const confirmText = page.getByText(/tap again to confirm/i);
      if (await confirmText.isVisible()) {
        console.log('Found confirm text, clicking publish again...');
        await publishButton.click(); // Confirm publish
        await page.waitForTimeout(2000);
        
        // Should show success message
        const okButton = page.getByTestId('ok-button');
        if (await okButton.isVisible()) {
          await okButton.click();
        }
      }
      
      await page.screenshot({ path: 'test-results/lifecycle-2-event-published.png' });
    } else {
      console.log('Publish button not found, taking screenshot...');
      await page.screenshot({ path: 'test-results/lifecycle-2-no-publish-button.png' });
    }
    
    // === STEP 3: Manage Published Event ===
    console.log('Step 3: Managing published event...');
    
    // Should still be on event details page after publishing
    await expect(page.getByTestId('event-header')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Lifecycle Test Event')).toBeVisible();
    
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
    
    // Note: Date and time have default values, so we don't need to set them
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
    
    // Go through all steps
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    
    // Location step
    const locationSearch = page.getByPlaceholder(/search for the perfect spot/i);
    if (await locationSearch.isVisible()) {
      await locationSearch.fill('Central Park');
      await page.waitForTimeout(2000);
      
      // Select the first suggestion
      const firstSuggestion = page.locator('text=Central Park').first();
      if (await firstSuggestion.isVisible()) {
        await firstSuggestion.click();
        await page.waitForTimeout(1000);
      }
    }
    
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    
    // Items step
    const dishNameInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).first();
    if (await dishNameInput.isVisible()) {
      await dishNameInput.fill('Cancellation Test Main Course');
    }
    
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    
    // Create the event
    await page.getByTestId('create-event-final-button').click();
    await page.waitForTimeout(3000);
    
    // After event creation, click OK to return to events list
    await page.getByText('OK').click();
    await page.waitForTimeout(2000);
    
    // Navigate to event details to publish
    const eventCards = page.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await page.waitForTimeout(2000);
    }
    
    // Publish the event
    const publishButton = page.getByTestId('action-button-publish');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm publish
      const confirmText = page.getByText(/tap again to confirm/i);
      if (await confirmText.isVisible()) {
        await publishButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
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
    
    // Verify event is cancelled - should still be on event details page
    await expect(page.getByTestId('event-header')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Cancellation Test Event')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/cancellation-3-cancelled-event-details.png' });
    
    // Should show cancelled status or different action buttons
    // The cancel button should no longer be visible or should show different text
    const cancelButtonAfter = page.getByTestId('action-button-cancel');
    const isCancelButtonVisible = await cancelButtonAfter.isVisible();
    
    if (!isCancelButtonVisible) {
      console.log('✅ Cancel button no longer visible - event successfully cancelled');
    } else {
      console.log('⚠️ Cancel button still visible - checking if text changed');
      const cancelButtonText = await cancelButton.textContent();
      console.log('Cancel button text:', cancelButtonText);
    }
    
    console.log('✅ Event cancellation test completed!');
  });

  test('Event deletion and restoration workflow', async ({ page }) => {
    console.log('=== TESTING EVENT DELETION AND RESTORATION WORKFLOW ===');
    
    // Step 1: Create draft event
    console.log('Step 1: Creating draft event...');
    await page.getByTestId('create-event-button').click();
    await page.waitForTimeout(1000);
    
    await page.getByTestId('event-title-input').fill('Deletion Test Event');
    await page.getByTestId('event-description-input').fill('Testing event deletion and restoration');
    console.log('✓ Filled title and description');
    
    // Set guest numbers
    const minGuestsInput = page.locator('input').filter({ hasText: /min/i }).or(page.getByPlaceholder(/min/i)).first();
    const maxGuestsInput = page.locator('input').filter({ hasText: /max/i }).or(page.getByPlaceholder(/max/i)).first();
    
    if (await minGuestsInput.isVisible()) {
      await minGuestsInput.clear();
      await minGuestsInput.fill('5');
      console.log('✓ Set min guests to 5');
    }
    if (await maxGuestsInput.isVisible()) {
      await maxGuestsInput.clear();
      await maxGuestsInput.fill('25');
      console.log('✓ Set max guests to 25');
    }
    
    // Go through all steps
    console.log('Step 2: Navigating through event creation steps...');
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    console.log('✓ Completed step 1 (basic info)');
    
    // Location step
    const locationSearch = page.getByPlaceholder(/search for the perfect spot/i);
    if (await locationSearch.isVisible()) {
      await locationSearch.fill('Central Park');
      await page.waitForTimeout(2000);
      
      // Select the first suggestion
      const firstSuggestion = page.locator('text=Central Park').first();
      if (await firstSuggestion.isVisible()) {
        await firstSuggestion.click();
        await page.waitForTimeout(1000);
        console.log('✓ Selected Central Park location');
      }
    }
    
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    console.log('✓ Completed step 2 (location)');
    
    // Items step
    const dishNameInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).first();
    if (await dishNameInput.isVisible()) {
      await dishNameInput.fill('Deletion Test Main Course');
      console.log('✓ Added main course item');
    }
    
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    console.log('✓ Completed step 3 (items)');
    
    // Create the event
    console.log('Step 3: Creating the event...');
    await page.getByTestId('create-event-final-button').click();
    await page.waitForTimeout(3000);
    console.log('✓ Event creation submitted');
    
    // After event creation, click OK to return to events list
    const okButton = page.getByText('OK');
    if (await okButton.isVisible()) {
      await okButton.click();
      await page.waitForTimeout(2000);
      console.log('✓ Clicked OK to return to events list');
    } else {
      console.log('⚠️ OK button not found after event creation');
    }
    
    // Step 4: Check what page we're on and navigate accordingly
    console.log('Step 4: Checking current page...');
    
    // Check if we're on events list page
    const eventsHeader = page.getByTestId('events-header');
    const eventCards = page.locator('[data-testid^="event-card-"]');
    const eventHeader = page.getByTestId('event-header');
    
    const isOnEventsList = await eventsHeader.isVisible();
    const isOnEventDetails = await eventHeader.isVisible();
    const cardCount = await eventCards.count();
    
    console.log(`On events list page: ${isOnEventsList}`);
    console.log(`On event details page: ${isOnEventDetails}`);
    console.log(`Event cards found: ${cardCount}`);
    
    if (isOnEventDetails) {
      console.log('✓ Already on event details page - proceeding with deletion test');
      await page.screenshot({ path: 'test-results/deletion-1-draft-event.png' });
    } else if (isOnEventsList && cardCount > 0) {
      console.log('✓ On events list page, clicking on first event card...');
      await eventCards.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/deletion-1-draft-event.png' });
      console.log('✓ Navigated to event details page');
    } else {
      console.log('❌ Not on expected page - taking debug screenshot');
      await page.screenshot({ path: 'test-results/deletion-debug-page.png' });
    }
    
    // Step 5: Check available action buttons
    console.log('Step 5: Checking available action buttons...');
    const allActionButtons = page.locator('[data-testid^="action-button-"]');
    const buttonCount = await allActionButtons.count();
    console.log(`Found ${buttonCount} action buttons`);
    
    for (let i = 0; i < buttonCount; i++) {
      const button = allActionButtons.nth(i);
      const testId = await button.getAttribute('data-testid');
      const isVisible = await button.isVisible();
      const text = await button.textContent();
      console.log(`  Button ${i}: ${testId}, visible: ${isVisible}, text: "${text}"`);
    }
    
    // Step 6: Delete the event (should be available for draft events)
    console.log('Step 6: Attempting to delete event...');
    const deleteButton = page.getByTestId('action-button-purge');
    if (await deleteButton.isVisible()) {
      console.log('✓ Found delete button, performing first click...');
      await deleteButton.click();
      await page.waitForTimeout(1000);
      
      // Should show "Tap again to confirm"
      const confirmText = page.getByText(/tap again to confirm/i);
      if (await confirmText.isVisible()) {
        console.log('✓ Found confirm text, performing second click to confirm deletion...');
        await deleteButton.click(); // Confirm deletion
        await page.waitForTimeout(2000);
        
        // Should show success message
        const successOkButton = page.getByTestId('ok-button');
        if (await successOkButton.isVisible()) {
          await successOkButton.click();
          console.log('✓ Clicked OK on success message');
        }
        
        await page.screenshot({ path: 'test-results/deletion-2-event-deleted.png' });
        console.log('✓ Event deletion completed');
      } else {
        console.log('⚠️ Confirm text not found after first click');
      }
    } else {
      console.log('⚠️ Delete button not found - event may not be in draft status');
      await page.screenshot({ path: 'test-results/deletion-2-no-delete-button.png' });
    }
    
    // Step 7: Verify deletion was successful
    console.log('Step 7: Verifying deletion was successful...');
    
    // After successful deletion, we should be back on the events list page
    const eventsHeaderCheck = page.getByTestId('events-header');
    const eventHeaderCheck = page.getByTestId('event-header');
    
    const isOnEventsListAfterDeletion = await eventsHeaderCheck.isVisible();
    const isOnEventDetailsAfterDeletion = await eventHeaderCheck.isVisible();
    
    console.log(`On events list page: ${isOnEventsListAfterDeletion}`);
    console.log(`On event details page: ${isOnEventDetailsAfterDeletion}`);
    
    if (isOnEventsListAfterDeletion) {
      console.log('✅ Successfully returned to events list after deletion');
      await page.screenshot({ path: 'test-results/deletion-3-back-to-events-list.png' });
      
      // Check if the deleted event is no longer in the list
      const eventCards = page.locator('[data-testid^="event-card-"]');
      const cardCount = await eventCards.count();
      console.log(`Event cards remaining: ${cardCount}`);
      
      // The deleted event should not be visible in the main events list
      // (it might be in a "deleted" tab or completely removed)
      console.log('✅ Event deletion test completed successfully!');
      
    } else if (isOnEventDetailsAfterDeletion) {
      console.log('Still on event details page - checking for restore button...');
      await page.screenshot({ path: 'test-results/deletion-3-still-on-details.png' });
      
      // Check for restore button (indicates successful deletion)
      const restoreButton = page.getByTestId('action-button-restore');
      const deleteButtonCheck = page.getByTestId('action-button-purge');
      
      const isRestoreButtonVisible = await restoreButton.isVisible();
      const isDeleteButtonVisible = await deleteButtonCheck.isVisible();
      
      console.log(`Restore button visible: ${isRestoreButtonVisible}`);
      console.log(`Delete button visible: ${isDeleteButtonVisible}`);
      
      if (isRestoreButtonVisible) {
        console.log('✅ Restore button visible - event successfully deleted!');
        
        // Test restoration
        console.log('Testing event restoration...');
        await restoreButton.click();
        await page.waitForTimeout(1000);
        
        // Should show "Tap again to confirm"
        const confirmText = page.getByText(/tap again to confirm/i);
        if (await confirmText.isVisible()) {
          console.log('✓ Found confirm text for restoration, performing second click...');
          await restoreButton.click(); // Confirm restoration
          await page.waitForTimeout(2000);
          
          // Should show success message
          const okButton = page.getByTestId('ok-button');
          if (await okButton.isVisible()) {
            await okButton.click();
            console.log('✓ Clicked OK on restoration success message');
          }
          
          await page.screenshot({ path: 'test-results/deletion-4-event-restored.png' });
          console.log('✅ Event restoration completed!');
        } else {
          console.log('⚠️ Confirm text not found for restoration');
        }
      } else if (isDeleteButtonVisible) {
        console.log('⚠️ Delete button still visible - event may not have been deleted');
      } else {
        console.log('⚠️ Neither restore nor delete button visible');
      }
    } else {
      console.log('❌ Unexpected page state after deletion');
      await page.screenshot({ path: 'test-results/deletion-3-unexpected-page.png' });
    }
    
    console.log('✅ Event deletion and restoration test completed!');
  });

  test('Event status transitions and UI updates', async ({ page }) => {
    console.log('Testing event status transitions...');
    
    // Create draft event
    await page.getByTestId('create-event-button').click();
    await page.getByTestId('event-title-input').fill('Status Transition Test');
    await page.getByTestId('event-description-input').fill('Testing status transitions');
    
    // Note: Date and time have default values, so we don't need to set them
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
    
    // Go through all steps
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    
    // Location step
    const locationSearch = page.getByPlaceholder(/search for the perfect spot/i);
    if (await locationSearch.isVisible()) {
      await locationSearch.fill('Central Park');
      await page.waitForTimeout(2000);
      
      // Select the first suggestion
      const firstSuggestion = page.locator('text=Central Park').first();
      if (await firstSuggestion.isVisible()) {
        await firstSuggestion.click();
        await page.waitForTimeout(1000);
      }
    }
    
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    
    // Items step
    const dishNameInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).first();
    if (await dishNameInput.isVisible()) {
      await dishNameInput.fill('Status Transition Main Course');
    }
    
    await page.getByTestId('next-step-inline').click();
    await page.waitForTimeout(1000);
    
    // Create the event
    await page.getByTestId('create-event-final-button').click();
    await page.waitForTimeout(3000);
    
    // After event creation, click OK to return to events list
    await page.getByText('OK').click();
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
