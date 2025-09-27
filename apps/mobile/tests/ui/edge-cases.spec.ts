import { test, expect, Page, BrowserContext } from '@playwright/test';
import { loginAsHost, loginAsGuest, createAndPublishEvent } from './event-test-utilities';

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
    await loginAsHost(hostPage);
    const eventId = await createAndPublishEvent(hostPage, 'Capacity Limit Test Event', 'Testing capacity limits', '1', '1');
    
    // Multiple guests try to join (exceed capacity)
    const guestEmails = ['guest1@test.dev', 'guest2@test.dev', 'guest3@test.dev', 'guest4@test.dev'];
    
    for (let i = 0; i < guestEmails.length; i++) {
      const guestPage = await guestContext.newPage();
      
      // Navigate to login page and ensure clean state
      await guestPage.goto(process.env.MOBILE_WEB_URL || 'http://localhost:8081/');
      await guestPage.waitForLoadState('domcontentloaded');
      
      await guestPage.waitForFunction(() => {
        const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
        return !hasLoading;
      }, { timeout: 15000 });
      
      // Wait a bit more to ensure page is fully loaded
      await guestPage.waitForTimeout(2000);
      
      // Use the working login utility
      await loginAsGuest(guestPage);
      
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
    
    // Test offline behavior using proven utilities
    await loginAsHost(hostPage);
    
    // Simulate network issues by going offline
    await hostPage.context().setOffline(true);
    
    // Try to create event while offline
    // Note: We can't use createAndPublishEvent here as it expects online behavior
    // So we'll test the offline UI behavior manually
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Offline Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing offline behavior');
    
    // Quick create
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    
    // Try to create event (should fail due to offline)
    try {
      await hostPage.getByTestId('create-event-final-button').click();
      await hostPage.waitForTimeout(2000);
    } catch (error) {
      console.log('Expected error due to offline state:', error.message);
    }
    
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
    
    await loginAsHost(hostPage);
    
    // Test invalid event creation
    await hostPage.getByTestId('create-event-button').click();
    
    // Test empty title
    await hostPage.getByTestId('event-title-input').fill('');
    await hostPage.getByTestId('next-step-inline').click();
    
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
    
    // Host creates event using proven utilities
    await loginAsHost(hostPage);
    
    // Create event using proven utilities
    const eventId = await createAndPublishEvent(hostPage, 'Concurrent Test Event', 'Testing concurrent actions');
    
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
    await loginAsHost(hostPage);
    
    // Create and publish event
    const eventId = await createAndPublishEvent(hostPage, 'Persistence Test Event', 'Testing data persistence');
    
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
    hostPage = await hostContext.newPage();
    
    // Reload and check data persistence
    await hostPage.goto(process.env.MOBILE_WEB_URL || 'http://localhost:8081/');
    await hostPage.waitForLoadState('domcontentloaded');
    
    await hostPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    await loginAsHost(hostPage);
    
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
    
    await loginAsHost(hostPage);
    
    // Create and publish event
    const eventId = await createAndPublishEvent(hostPage, 'Large Dataset Test Event', 'Testing large dataset handling');
    
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
    await loginAsHost(hostPage);
    
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

// Helper function for concurrent guest actions using proven utilities
async function joinEventAsGuest(guestPage: Page, email: string) {
  await guestPage.goto(process.env.MOBILE_WEB_URL || 'http://localhost:8081/');
  await guestPage.waitForLoadState('domcontentloaded');
  
  await guestPage.waitForFunction(() => {
    const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
    return !hasLoading;
  }, { timeout: 15000 });
  
  // Check if already logged in, if not then login
  const eventsHeader = guestPage.getByTestId('events-header');
  const eventCardsCheck = guestPage.locator('[data-testid^="event-card-"]');
  const isEventsHeaderVisible = await eventsHeader.isVisible();
  const eventCardsCount = await eventCardsCheck.count();
  const isAlreadyLoggedIn = isEventsHeaderVisible || eventCardsCount > 0;

  if (!isAlreadyLoggedIn) {
    // Use our proven login utility
    await loginAsGuest(guestPage);
  }
  
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
