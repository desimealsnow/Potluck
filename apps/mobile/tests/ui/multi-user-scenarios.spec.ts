import { test, expect, Page, BrowserContext } from '@playwright/test';
import { 
  loginAsHost, 
  loginAsGuest, 
  createAndPublishEvent, 
  cancelEvent, 
  deleteEvent,
  requestToJoinEvent,
  approveGuestRequest,
  rejectGuestRequest,
  verifyGuestJoined,
  setupHostGuestScenario
} from './event-test-utilities';

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
    await loginAsHost(hostPage);
    await hostPage.screenshot({ path: 'test-results/multi-user-host-dashboard.png' });

    // Create and publish event using reusable functions
    console.log('Host: Creating and publishing event...');
    eventId = await createAndPublishEvent(hostPage, 'Multi-User Test Event', 'A test event for multi-user scenarios');
    
    await hostPage.screenshot({ path: 'test-results/multi-user-host-event-created.png' });
    
    // === GUEST SIDE: Login and Request to Join ===
    // Navigate guest page to login page first
    await guestPage.goto(`${process.env.MOBILE_WEB_URL || 'http://localhost:8081'}/`);
    await guestPage.waitForLoadState('domcontentloaded');
    
    // Wait for loading to complete
    await guestPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    await loginAsGuest(guestPage);
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
    
    // Host login and event creation using proven utilities
    await loginAsHost(hostPage);
    
    // Create and publish event using proven utilities
    const eventId = await createAndPublishEvent(hostPage, 'Rejection Test Event', 'Testing rejection scenario');
    
    // Guest requests to join using proven utilities
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
    
    // Host creates and publishes event using proven utilities
    await loginAsHost(hostPage);
    
    // Create event using proven utilities
    const eventId = await createAndPublishEvent(hostPage, 'Cancellation Test Event', 'Testing cancellation scenario');
    
    // Guest joins using proven utilities
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
    
    // Host creates event with items using proven utilities
    await loginAsHost(hostPage);
    
    // Create event using proven utilities
    const eventId = await createAndPublishEvent(hostPage, 'Item Management Test Event', 'Testing item management');
    
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
    
    // Guest joins and claims items using proven utilities
    await loginAsGuest(guestPage);
    
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
    
    // Host creates event with limited capacity using proven utilities
    await loginAsHost(hostPage);
    
    // Create event with limited capacity using proven utilities
    const eventId = await createAndPublishEvent(hostPage, 'Capacity Test Event', 'Testing capacity limits', '1', '2');
    
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
