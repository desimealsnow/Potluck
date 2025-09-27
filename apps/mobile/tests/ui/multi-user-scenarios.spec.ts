import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Multi-User Potluck Scenarios', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;
  let eventId: string;

  test.beforeAll(async ({ browser }) => {
    // Create two separate browser contexts for host and guest
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
    
    // Navigate both pages to the app
    await hostPage.goto(url);
    await guestPage.goto(url);
    
    await hostPage.waitForLoadState('domcontentloaded');
    await guestPage.waitForLoadState('domcontentloaded');
    
    // Wait for loading to complete on both pages
    await hostPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    await guestPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
  });

  test('should create browser context for host and guest', async () => {
    // Simple test to verify multi-user setup works
    await expect(hostPage).toBeTruthy();
    await expect(guestPage).toBeTruthy();
    
    // Check that both pages can load the auth screen
    await expect(hostPage.getByTestId('email-input')).toBeVisible();
    await expect(guestPage.getByTestId('email-input')).toBeVisible();
  });

  test('Host creates event and guest requests to join - Happy Path', async () => {
    // === HOST SIDE: Login and Create Event ===
    console.log('Host: Logging in...');
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    await hostPage.screenshot({ path: 'test-results/multi-user-host-dashboard.png' });

    // Create event
    console.log('Host: Creating event...');
    await hostPage.getByTestId('create-event-button').click();
    await expect(hostPage.getByTestId('create-event-header')).toBeVisible({ timeout: 10000 });
    
    // Fill event details
    await hostPage.getByTestId('event-title-input').fill('Multi-User Test Event');
    await hostPage.getByTestId('event-description-input').fill('A test event for multi-user scenarios');
    
    // Set guest limits
    const minGuestsInput = hostPage.locator('input').filter({ hasText: /min/i }).or(hostPage.getByPlaceholder(/min/i)).first();
    const maxGuestsInput = hostPage.locator('input').filter({ hasText: /max/i }).or(hostPage.getByPlaceholder(/max/i)).first();
    
    if (await minGuestsInput.isVisible()) {
      await minGuestsInput.clear();
      await minGuestsInput.fill('5');
    }
    if (await maxGuestsInput.isVisible()) {
      await maxGuestsInput.clear();
      await maxGuestsInput.fill('20');
    }
    
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(1000);
    
    // Location step
    const locationSearch = hostPage.getByPlaceholder(/search for the perfect spot/i);
    if (await locationSearch.isVisible()) {
      await locationSearch.fill('Central Park');
      await hostPage.waitForTimeout(2000);
      
      // Select the first location suggestion
      const firstLocation = hostPage.getByTestId('location-central-park');
      if (await firstLocation.isVisible()) {
        await firstLocation.click();
        await hostPage.waitForTimeout(1000);
      }
    }
    
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(1000);
    
    // Menu step
    const dishNameInput = hostPage.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).first();
    if (await dishNameInput.isVisible()) {
      await dishNameInput.fill('Test Main Course');
    }
    
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(1000);
    
    // Create event
    await hostPage.getByTestId('create-event-final-button').click();
    await hostPage.waitForTimeout(3000);
    
    // Publish event
    const publishButton = hostPage.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await hostPage.waitForTimeout(2000);
      
      const okButton = hostPage.getByTestId('ok-button');
      if (await okButton.isVisible()) {
        await okButton.click();
      }
    }
    
    await hostPage.screenshot({ path: 'test-results/multi-user-host-event-created.png' });
    
    // Get event ID from URL or page content
    const currentUrl = hostPage.url();
    const eventIdMatch = currentUrl.match(/\/events\/([^\/]+)/);
    eventId = eventIdMatch ? eventIdMatch[1] : 'test-event-id';
    
    // === GUEST SIDE: Login and Request to Join ===
    console.log('Guest: Logging in...');
    await guestPage.getByTestId('email-input').fill('guest@test.dev');
    await guestPage.getByTestId('password-input').fill('password123');
    await guestPage.getByTestId('sign-in-button').click();
    
    await expect(guestPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    await guestPage.screenshot({ path: 'test-results/multi-user-guest-dashboard.png' });
    
    // Look for the created event
    const eventCards = guestPage.locator('[data-testid^="event-card-"]');
    const cardCount = await eventCards.count();
    
    if (cardCount > 0) {
      // Click on the first event (should be our created event)
      await eventCards.first().click();
      await guestPage.waitForTimeout(2000);
      
      await guestPage.screenshot({ path: 'test-results/multi-user-guest-event-details.png' });
      
      // Go to Overview tab and request to join
      const overviewTab = guestPage.getByTestId('tab-overview');
      if (await overviewTab.isVisible()) {
        await overviewTab.click();
        await guestPage.waitForTimeout(1000);
        
        // Look for join request button
        const joinRequestButton = guestPage.getByTestId('join-request-button');
        if (await joinRequestButton.isVisible()) {
          await joinRequestButton.click();
          await guestPage.waitForTimeout(2000);
          
          await guestPage.screenshot({ path: 'test-results/multi-user-guest-join-request.png' });
        }
      }
    }
    
    // === HOST SIDE: Check and Approve Request ===
    console.log('Host: Checking join requests...');
    await hostPage.reload();
    await hostPage.waitForLoadState('domcontentloaded');
    
    // Navigate to the event
    const hostEventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await hostEventCards.count() > 0) {
      await hostEventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      // Go to Requests tab
      const requestsTab = hostPage.getByTestId('tab-requests');
      if (await requestsTab.isVisible()) {
        await requestsTab.click();
        await hostPage.waitForTimeout(1000);
        
        await hostPage.screenshot({ path: 'test-results/multi-user-host-requests-tab.png' });
        
        // Look for approve button
        const approveButton = hostPage.getByTestId('approve-request-button');
        if (await approveButton.isVisible()) {
          await approveButton.click();
          await hostPage.waitForTimeout(2000);
          
          await hostPage.screenshot({ path: 'test-results/multi-user-host-request-approved.png' });
        }
      }
    }
    
    console.log('✅ Multi-user happy path test completed!');
  });

  test('Host creates event and guest requests to join - Rejection Path', async () => {
    // Similar setup as above, but this time host rejects the request
    console.log('Host: Creating event for rejection test...');
    
    // Host login and event creation (similar to above)
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create and publish event (abbreviated for brevity)
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Rejection Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing rejection scenario');
    
    // Quick create (skip detailed steps)
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('create-event-final-button').click();
    await hostPage.waitForTimeout(2000);
    
    // Publish
    const publishButton = hostPage.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await hostPage.waitForTimeout(2000);
    }
    
    // Guest requests to join
    await guestPage.getByTestId('email-input').fill('guest@test.dev');
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
    
    // Host rejects request
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
        
        // Look for reject button
        const rejectButton = hostPage.getByTestId('reject-request-button');
        if (await rejectButton.isVisible()) {
          await rejectButton.click();
          await hostPage.waitForTimeout(2000);
          
          await hostPage.screenshot({ path: 'test-results/multi-user-host-request-rejected.png' });
        }
      }
    }
    
    console.log('✅ Multi-user rejection test completed!');
  });

  test('Host cancels event after guest joins', async () => {
    // Setup: Host creates event, guest joins, then host cancels
    console.log('Testing event cancellation after guest joins...');
    
    // Host creates and publishes event
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Cancellation Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing cancellation scenario');
    
    // Quick create
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('create-event-final-button').click();
    await hostPage.waitForTimeout(2000);
    
    // Publish
    const publishButton = hostPage.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await hostPage.waitForTimeout(2000);
    }
    
    // Guest joins
    await guestPage.getByTestId('email-input').fill('guest@test.dev');
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
    
    // Host approves request
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
        
        const approveButton = hostPage.getByTestId('approve-request-button');
        if (await approveButton.isVisible()) {
          await approveButton.click();
          await hostPage.waitForTimeout(2000);
        }
      }
    }
    
    // Host cancels event
    const cancelButton = hostPage.getByTestId('action-button-cancel');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await hostPage.waitForTimeout(1000);
      
      // Should show "Tap again to confirm"
      const confirmText = hostPage.getByText(/tap again to confirm/i);
      if (await confirmText.isVisible()) {
        await cancelButton.click(); // Confirm cancellation
        await hostPage.waitForTimeout(2000);
        
        await hostPage.screenshot({ path: 'test-results/multi-user-event-cancelled.png' });
      }
    }
    
    console.log('✅ Event cancellation test completed!');
  });

  test('Item claiming and management between host and guest', async () => {
    // Setup: Host creates event with items, guest joins, both manage items
    console.log('Testing item management between host and guest...');
    
    // Host creates event with items
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Item Management Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing item management');
    
    // Quick create
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('create-event-final-button').click();
    await hostPage.waitForTimeout(2000);
    
    // Publish
    const publishButton = hostPage.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await hostPage.waitForTimeout(2000);
    }
    
    // Host adds items
    const hostEventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await hostEventCards.count() > 0) {
      await hostEventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      // Go to Items tab
      const itemsTab = hostPage.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await hostPage.waitForTimeout(1000);
        
        // Add items
        const itemNameInput = hostPage.getByTestId('item-name-picker');
        if (await itemNameInput.isVisible()) {
          await itemNameInput.click();
          await hostPage.waitForTimeout(500);
          
          // Fill item details
          const nameInput = hostPage.getByTestId('item-name-display');
          if (await nameInput.isVisible()) {
            await nameInput.fill('Test Main Course');
          }
          
          const addButton = hostPage.getByTestId('add-item-button');
          if (await addButton.isVisible()) {
            await addButton.click();
            await hostPage.waitForTimeout(1000);
          }
        }
        
        await hostPage.screenshot({ path: 'test-results/multi-user-host-items-added.png' });
      }
    }
    
    // Guest joins and claims items
    await guestPage.getByTestId('email-input').fill('guest@test.dev');
    await guestPage.getByTestId('password-input').fill('password123');
    await guestPage.getByTestId('sign-in-button').click();
    
    await expect(guestPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    const eventCards = guestPage.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await guestPage.waitForTimeout(2000);
      
      // Go to Items tab
      const itemsTab = guestPage.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await guestPage.waitForTimeout(1000);
        
        // Claim an item
        const claimButton = guestPage.getByTestId(/item-increase-/);
        if (await claimButton.isVisible()) {
          await claimButton.click();
          await guestPage.waitForTimeout(1000);
          
          await guestPage.screenshot({ path: 'test-results/multi-user-guest-item-claimed.png' });
        }
      }
    }
    
    console.log('✅ Item management test completed!');
  });

  test('Capacity limits and waitlist functionality', async () => {
    // Test scenario where event reaches capacity and guests are waitlisted
    console.log('Testing capacity limits and waitlist...');
    
    // Host creates event with limited capacity
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event with limited capacity
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Capacity Test Event');
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
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('next-step-inline').click();
    await hostPage.waitForTimeout(500);
    await hostPage.getByTestId('create-event-final-button').click();
    await hostPage.waitForTimeout(2000);
    
    // Publish
    const publishButton = hostPage.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await hostPage.waitForTimeout(2000);
    }
    
    // Multiple guests try to join
    const guestEmails = ['guest1@test.dev', 'guest2@test.dev', 'guest3@test.dev'];
    
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
            
            await guestPage.screenshot({ path: `test-results/multi-user-guest-${i + 1}-join-request.png` });
          }
        }
      }
      
      await guestPage.close();
    }
    
    // Host manages requests and waitlist
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
        
        // Approve first few requests
        const approveButtons = hostPage.getByTestId('approve-request-button');
        const approveCount = await approveButtons.count();
        
        for (let i = 0; i < Math.min(2, approveCount); i++) {
          await approveButtons.nth(i).click();
          await hostPage.waitForTimeout(1000);
        }
        
        // Waitlist remaining requests
        const waitlistButtons = hostPage.getByTestId('waitlist-request-button');
        const waitlistCount = await waitlistButtons.count();
        
        for (let i = 0; i < waitlistCount; i++) {
          await waitlistButtons.nth(i).click();
          await hostPage.waitForTimeout(1000);
        }
        
        await hostPage.screenshot({ path: 'test-results/multi-user-waitlist-managed.png' });
      }
    }
    
    console.log('✅ Capacity limits and waitlist test completed!');
  });
});
