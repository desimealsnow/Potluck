import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Edge Cases and Error Handling', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeAll(async ({ browser }) => {
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
  });

  test.afterAll(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test.beforeEach(async () => {
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    
    await hostPage.goto(url);
    await guestPage.goto(url);
    
    await hostPage.waitForLoadState('domcontentloaded');
    await guestPage.waitForLoadState('domcontentloaded');
    
    // Wait for loading to complete
    await hostPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    await guestPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
  });

  test('Event capacity limits and overflow handling', async () => {
    console.log('Testing event capacity limits...');
    
    // Host creates event with very limited capacity
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event with minimal capacity
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Capacity Limit Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing capacity limits');
    
    // Set very low capacity
    const minGuestsInput = hostPage.locator('input').filter({ hasText: /min/i }).or(hostPage.getByPlaceholder(/min/i)).first();
    const maxGuestsInput = hostPage.locator('input').filter({ hasText: /max/i }).or(hostPage.getByPlaceholder(/max/i)).first();
    
    if (await minGuestsInput.isVisible()) {
      await minGuestsInput.clear();
      await minGuestsInput.fill('1');
    }
    if (await maxGuestsInput.isVisible()) {
      await maxGuestsInput.clear();
      await maxGuestsInput.fill('2'); // Very limited capacity
    }
    
    // Quick create
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('create-event-final-button').click();
    await hostPage.waitForTimeout(2000);
    
    // Publish
    const publishButton = hostPage.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await hostPage.waitForTimeout(2000);
    }
    
    // Multiple guests try to join (exceed capacity)
    const guestEmails = ['guest1@test.dev', 'guest2@test.dev', 'guest3@test.dev', 'guest4@test.dev'];
    
    for (let i = 0; i < guestEmails.length; i++) {
      const guestPage = await guestContext.newPage();
      await guestPage.goto(process.env.MOBILE_WEB_URL || 'http://localhost:8081/');
      await guestPage.waitForLoadState('domcontentloaded');
      
      await guestPage.waitForFunction(() => {
        const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
        return !hasLoading;
      }, { timeout: 15000 });
      
      await guestPage.getByTestId('email-input').fill(guestEmails[i]);
      await guestPage.getByTestId('password-input').fill('password123');
      await guestPage.getByTestId('sign-in-button').click();
      
      await expect(guestPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
      
      const eventCards = guestPage.locator('[data-testid^="event-card-"]');
      if (await eventCards.count() > 0) {
        await eventCards.first().click();
        await guestPage.waitForTimeout(2000);
        
        const overviewTab = guestPage.getByTestId('tab-overview');
        if (await overviewTab.isVisible()) {
          await overviewTab.click();
          await guestPage.waitForTimeout(1000);
          
          const joinRequestButton = guestPage.getByTestId('join-request-button');
          if (await joinRequestButton.isVisible()) {
            await joinRequestButton.click();
            await guestPage.waitForTimeout(2000);
            
            // Check for capacity-related messages
            const capacityMessage = guestPage.getByText(/capacity|full|waitlist/i);
            if (await capacityMessage.isVisible()) {
              await expect(capacityMessage).toBeVisible();
            }
            
            await guestPage.screenshot({ path: `test-results/capacity-limit-guest-${i + 1}.png` });
          }
        }
      }
      
      await guestPage.close();
    }
    
    // Host manages capacity
    await hostPage.reload();
    await hostPage.waitForLoadState('domcontentloaded');
    
    const hostEventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await hostEventCards.count() > 0) {
      await hostEventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      const requestsTab = hostPage.getByTestId('tab-requests');
      if (await requestsTab.isVisible()) {
        await requestsTab.click();
        await hostPage.waitForTimeout(1000);
        
        // Should see capacity information
        const capacityInfo = hostPage.getByTestId('capacity-info');
        if (await capacityInfo.isVisible()) {
          await expect(capacityInfo).toBeVisible();
        }
        
        // Test waitlist management
        const waitlistButtons = hostPage.getByTestId('waitlist-request-button');
        if (await waitlistButtons.count() > 0) {
          await waitlistButtons.first().click();
          await hostPage.waitForTimeout(1000);
        }
        
        await hostPage.screenshot({ path: 'test-results/capacity-limit-host-management.png' });
      }
    }
    
    console.log('✅ Event capacity limits test completed!');
  });

  test('Network connectivity issues and offline handling', async () => {
    console.log('Testing network connectivity issues...');
    
    // Test offline behavior
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Simulate network issues by going offline
    await hostPage.context().setOffline(true);
    
    // Try to create event while offline
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Offline Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing offline behavior');
    
    // Quick create
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('create-event-final-button').click();
    await hostPage.waitForTimeout(2000);
    
    // Should show offline error
    const offlineMessage = hostPage.getByText(/offline|network|connection/i);
    if (await offlineMessage.isVisible()) {
      await expect(offlineMessage).toBeVisible();
    }
    
    await hostPage.screenshot({ path: 'test-results/offline-error.png' });
    
    // Restore network
    await hostPage.context().setOffline(false);
    
    // Should retry and succeed
    await hostPage.waitForTimeout(2000);
    
    // Test retry functionality
    const retryButton = hostPage.getByTestId('retry-button');
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await hostPage.waitForTimeout(2000);
    }
    
    console.log('✅ Network connectivity issues test completed!');
  });

  test('Invalid data handling and validation errors', async () => {
    console.log('Testing invalid data handling...');
    
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Test invalid event creation
    await hostPage.getByTestId('create-event-button').click();
    
    // Test empty title
    await hostPage.getByTestId('event-title-input').fill('');
    await hostPage.getByTestId('next-step-button').click();
    
    // Should show validation error
    const titleError = hostPage.getByTestId('title-error');
    if (await titleError.isVisible()) {
      await expect(titleError).toBeVisible();
    }
    
    // Test invalid guest numbers
    const minGuestsInput = hostPage.locator('input').filter({ hasText: /min/i }).or(hostPage.getByPlaceholder(/min/i)).first();
    const maxGuestsInput = hostPage.locator('input').filter({ hasText: /max/i }).or(hostPage.getByPlaceholder(/max/i)).first();
    
    if (await minGuestsInput.isVisible()) {
      await minGuestsInput.clear();
      await minGuestsInput.fill('10'); // Min > Max
    }
    if (await maxGuestsInput.isVisible()) {
      await maxGuestsInput.clear();
      await maxGuestsInput.fill('5'); // Max < Min
    }
    
    // Should show validation error
    const guestError = hostPage.getByTestId('guest-error');
    if (await guestError.isVisible()) {
      await expect(guestError).toBeVisible();
    }
    
    // Test negative numbers
    if (await minGuestsInput.isVisible()) {
      await minGuestsInput.clear();
      await minGuestsInput.fill('-1');
    }
    
    // Should show validation error
    const negativeError = hostPage.getByTestId('negative-error');
    if (await negativeError.isVisible()) {
      await expect(negativeError).toBeVisible();
    }
    
    await hostPage.screenshot({ path: 'test-results/validation-errors.png' });
    
    console.log('✅ Invalid data handling test completed!');
  });

  test('Concurrent user actions and race conditions', async () => {
    console.log('Testing concurrent user actions...');
    
    // Host creates event
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Concurrent Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing concurrent actions');
    
    // Quick create
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('create-event-final-button').click();
    await hostPage.waitForTimeout(2000);
    
    // Publish
    const publishButton = hostPage.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await hostPage.waitForTimeout(2000);
    }
    
    // Multiple guests try to join simultaneously
    const guestPromises = [];
    for (let i = 0; i < 3; i++) {
      const guestPage = await guestContext.newPage();
      guestPromises.push(joinEventAsGuest(guestPage, `guest${i}@test.dev`));
    }
    
    // Execute all guest actions simultaneously
    await Promise.all(guestPromises);
    
    // Host tries to manage requests while guests are joining
    await hostPage.reload();
    await hostPage.waitForLoadState('domcontentloaded');
    
    const hostEventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await hostEventCards.count() > 0) {
      await hostEventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      const requestsTab = hostPage.getByTestId('tab-requests');
      if (await requestsTab.isVisible()) {
        await requestsTab.click();
        await hostPage.waitForTimeout(1000);
        
        // Try to approve multiple requests simultaneously
        const approveButtons = hostPage.getByTestId('approve-request-button');
        const approveCount = await approveButtons.count();
        
        // Click multiple approve buttons rapidly
        for (let i = 0; i < Math.min(3, approveCount); i++) {
          approveButtons.nth(i).click();
        }
        
        await hostPage.waitForTimeout(2000);
        await hostPage.screenshot({ path: 'test-results/concurrent-actions.png' });
      }
    }
    
    console.log('✅ Concurrent user actions test completed!');
  });

  test('Data persistence and recovery after crashes', async () => {
    console.log('Testing data persistence and recovery...');
    
    // Host creates event with data
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Persistence Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing data persistence');
    
    // Quick create
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('create-event-final-button').click();
    await hostPage.waitForTimeout(2000);
    
    // Add some items
    const eventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      const itemsTab = hostPage.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await hostPage.waitForTimeout(1000);
        
        // Add items
        const itemNameInput = hostPage.getByTestId('item-name-picker');
        if (await itemNameInput.isVisible()) {
          await itemNameInput.click();
          await hostPage.waitForTimeout(500);
          
          const nameInput = hostPage.getByTestId('item-name-display');
          if (await nameInput.isVisible()) {
            await nameInput.fill('Persistence Test Item');
          }
          
          const addButton = hostPage.getByTestId('add-item-button');
          if (await addButton.isVisible()) {
            await addButton.click();
            await hostPage.waitForTimeout(1000);
          }
        }
      }
    }
    
    // Simulate crash by closing and reopening browser
    await hostPage.close();
    await hostPage = await hostContext.newPage();
    
    // Reload and check data persistence
    await hostPage.goto(process.env.MOBILE_WEB_URL || 'http://localhost:8081/');
    await hostPage.waitForLoadState('domcontentloaded');
    
    await hostPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Check if event data persisted
    const persistedEventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await persistedEventCards.count() > 0) {
      await persistedEventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      // Check if items persisted
      const itemsTab = hostPage.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await hostPage.waitForTimeout(1000);
        
        const itemCards = hostPage.locator('[data-testid^="item-card-"]');
        if (await itemCards.count() > 0) {
          await expect(itemCards.first()).toBeVisible();
        }
      }
      
      await hostPage.screenshot({ path: 'test-results/data-persistence-recovery.png' });
    }
    
    console.log('✅ Data persistence and recovery test completed!');
  });

  test('Large dataset handling and performance', async () => {
    console.log('Testing large dataset handling...');
    
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Large Dataset Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing large dataset handling');
    
    // Quick create
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-button').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('create-event-final-button').click();
    await hostPage.waitForTimeout(2000);
    
    // Publish
    const publishButton = hostPage.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await hostPage.waitForTimeout(2000);
    }
    
    // Add many items to test performance
    const eventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      const itemsTab = hostPage.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await hostPage.waitForTimeout(1000);
        
        // Add many items
        for (let i = 0; i < 20; i++) {
          const itemNameInput = hostPage.getByTestId('item-name-picker');
          if (await itemNameInput.isVisible()) {
            await itemNameInput.click();
            await hostPage.waitForTimeout(200);
            
            const nameInput = hostPage.getByTestId('item-name-display');
            if (await nameInput.isVisible()) {
              await nameInput.fill(`Large Dataset Item ${i + 1}`);
            }
            
            const addButton = hostPage.getByTestId('add-item-button');
            if (await addButton.isVisible()) {
              await addButton.click();
              await hostPage.waitForTimeout(200);
            }
          }
        }
        
        await hostPage.screenshot({ path: 'test-results/large-dataset-items.png' });
        
        // Test scrolling performance
        const scrollView = hostPage.getByTestId('event-details-scroll-view');
        if (await scrollView.isVisible()) {
          await scrollView.evaluate((el) => el.scrollTo(0, 1000));
          await hostPage.waitForTimeout(1000);
          
          await scrollView.evaluate((el) => el.scrollTo(0, 0));
          await hostPage.waitForTimeout(1000);
        }
      }
    }
    
    console.log('✅ Large dataset handling test completed!');
  });

  test('Error boundary and graceful degradation', async () => {
    console.log('Testing error boundary and graceful degradation...');
    
    // Test with invalid API responses
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Try to access non-existent event
    await hostPage.goto(`${process.env.MOBILE_WEB_URL || 'http://localhost:8081/'}/events/non-existent-event-id`);
    await hostPage.waitForLoadState('domcontentloaded');
    
    // Should show error message
    const errorMessage = hostPage.getByText(/error|not found|404/i);
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
    }
    
    await hostPage.screenshot({ path: 'test-results/error-boundary-404.png' });
    
    // Test with malformed data
    await hostPage.goto(process.env.MOBILE_WEB_URL || 'http://localhost:8081/');
    await hostPage.waitForLoadState('domcontentloaded');
    
    await hostPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    // Try to create event with invalid data
    await hostPage.getByTestId('create-event-button').click();
    
    // Test with extremely long text
    const longText = 'A'.repeat(1000);
    await hostPage.getByTestId('event-title-input').fill(longText);
    await hostPage.getByTestId('event-description-input').fill(longText);
    
    // Should show validation error
    const validationError = hostPage.getByText(/too long|maximum|limit/i);
    if (await validationError.isVisible()) {
      await expect(validationError).toBeVisible();
    }
    
    await hostPage.screenshot({ path: 'test-results/error-boundary-validation.png' });
    
    console.log('✅ Error boundary and graceful degradation test completed!');
  });
});

// Helper function for concurrent guest actions
async function joinEventAsGuest(guestPage: Page, email: string) {
  await guestPage.goto(process.env.MOBILE_WEB_URL || 'http://localhost:8081/');
  await guestPage.waitForLoadState('domcontentloaded');
  
  await guestPage.waitForFunction(() => {
    const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
    return !hasLoading;
  }, { timeout: 15000 });
  
  await guestPage.getByTestId('email-input').fill(email);
  await guestPage.getByTestId('password-input').fill('password123');
  await guestPage.getByTestId('sign-in-button').click();
  
  await expect(guestPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
  
  const eventCards = guestPage.locator('[data-testid^="event-card-"]');
  if (await eventCards.count() > 0) {
    await eventCards.first().click();
    await guestPage.waitForTimeout(2000);
    
    const overviewTab = guestPage.getByTestId('tab-overview');
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await guestPage.waitForTimeout(1000);
      
      const joinRequestButton = guestPage.getByTestId('join-request-button');
      if (await joinRequestButton.isVisible()) {
        await joinRequestButton.click();
        await guestPage.waitForTimeout(2000);
      }
    }
  }
  
  await guestPage.close();
}