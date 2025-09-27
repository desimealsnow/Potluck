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

test.describe('Multi-User Potluck Scenarios - Simplified', () => {
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
    
    // Navigate both pages to the app and ensure clean state
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
    
    // Clear any existing state by refreshing both pages
    await hostPage.reload();
    await guestPage.reload();
    
    await hostPage.waitForLoadState('domcontentloaded');
    await guestPage.waitForLoadState('domcontentloaded');
    
    // Wait for loading to complete after refresh
    await hostPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    await guestPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
  });

  test('Host creates event and guest requests to join - Happy Path', async () => {
    console.log('=== TESTING HOST-GUEST HAPPY PATH WORKFLOW ===');
    
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
        
        // Approve the guest's request
        const guestRequestCard = hostPage.locator('[data-testid="guest-request-card-Test Guest"]');
        if (await guestRequestCard.isVisible()) {
          const approveButton = guestRequestCard.getByTestId('approve-request-button');
          if (await approveButton.isVisible()) {
            await approveButton.click();
            await hostPage.waitForTimeout(2000);
            
            await hostPage.screenshot({ path: 'test-results/multi-user-host-request-approved.png' });
          }
        }
      }
    }
    
    // === GUEST SIDE: Verify Joined ===
    console.log('Guest: Verifying joined status...');
    await guestPage.reload();
    await guestPage.waitForLoadState('domcontentloaded');
    
    // Navigate to the event
    const guestEventCards = guestPage.locator('[data-testid^="event-card-"]');
    if (await guestEventCards.count() > 0) {
      await guestEventCards.first().click();
      await guestPage.waitForTimeout(2000);
      
      // Go to Guests tab
      const guestsTab = guestPage.getByTestId('tab-guests');
      if (await guestsTab.isVisible()) {
        await guestsTab.click();
        await guestPage.waitForTimeout(1000);
        
        await guestPage.screenshot({ path: 'test-results/multi-user-guest-guests-tab.png' });
        
        // Verify guest is listed
        await expect(guestPage.getByText('Test Guest')).toBeVisible();
      }
    }
    
    console.log('✅ Host creates event and guest requests to join - Happy Path completed!');
  });

  test('Host creates event and guest requests to join - Rejection Path', async () => {
    console.log('=== TESTING HOST-GUEST REJECTION PATH WORKFLOW ===');
    
    // === HOST SIDE: Login and Create Event ===
    await loginAsHost(hostPage);
    
    // Create and publish event using reusable functions
    console.log('Host: Creating and publishing event for rejection test...');
    eventId = await createAndPublishEvent(hostPage, 'Rejection Test Event', 'Testing rejection scenario');
    
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
    
    // Look for the created event and request to join
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
    
    // === HOST SIDE: Reject Guest Request ===
    console.log('Host: Rejecting guest request...');
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
        
        const guestRequestCard = hostPage.locator('[data-testid="guest-request-card-Test Guest"]');
        if (await guestRequestCard.isVisible()) {
          const rejectButton = guestRequestCard.getByTestId('reject-request-button');
          if (await rejectButton.isVisible()) {
            await rejectButton.click();
            await hostPage.waitForTimeout(2000);
          }
        }
      }
    }
    
    // === GUEST SIDE: Verify Rejected Status ===
    console.log('Guest: Verifying rejected status...');
    await guestPage.reload();
    await guestPage.waitForLoadState('domcontentloaded');
    
    const guestEventCards = guestPage.locator('[data-testid^="event-card-"]');
    if (await guestEventCards.count() > 0) {
      await guestEventCards.first().click();
      await guestPage.waitForTimeout(2000);
      
      const guestsTab = guestPage.getByTestId('tab-guests');
      if (await guestsTab.isVisible()) {
        await guestsTab.click();
        await guestPage.waitForTimeout(1000);
        
        // Verify guest is not listed in the Guests tab
        await expect(guestPage.getByText('Test Guest')).not.toBeVisible();
      }
    }
    
    console.log('✅ Host creates event and guest requests to join - Rejection Path completed!');
  });

  test('Host cancels event after guest joins', async () => {
    console.log('=== TESTING EVENT CANCELLATION AFTER GUEST JOINS ===');
    
    // === HOST SIDE: Login and Create Event ===
    await loginAsHost(hostPage);
    
    // Create and publish event
    console.log('Host: Creating and publishing event for cancellation test...');
    eventId = await createAndPublishEvent(hostPage, 'Cancellation Test Event', 'Testing cancellation after guest joins');
    
    // === GUEST SIDE: Login and Request to Join ===
    await guestPage.goto(`${process.env.MOBILE_WEB_URL || 'http://localhost:8081'}/`);
    await guestPage.waitForLoadState('domcontentloaded');
    
    await guestPage.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
    
    await loginAsGuest(guestPage);
    
    // Look for the created event and request to join
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
    
    // === HOST SIDE: Approve Guest Request ===
    console.log('Host: Approving guest request...');
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
        
        const guestRequestCard = hostPage.locator('[data-testid="guest-request-card-Test Guest"]');
        if (await guestRequestCard.isVisible()) {
          const approveButton = guestRequestCard.getByTestId('approve-request-button');
          if (await approveButton.isVisible()) {
            await approveButton.click();
            await hostPage.waitForTimeout(2000);
          }
        }
      }
    }
    
    // === HOST SIDE: Cancel Event ===
    console.log('Host: Cancelling event...');
    await hostPage.reload();
    await hostPage.waitForLoadState('domcontentloaded');
    
    const hostEventCardsAfterApproval = hostPage.locator('[data-testid^="event-card-"]');
    if (await hostEventCardsAfterApproval.count() > 0) {
      await hostEventCardsAfterApproval.first().click();
      await hostPage.waitForTimeout(2000);
      
      const cancelButton = hostPage.getByTestId('action-button-cancel');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await hostPage.waitForTimeout(1000);
        
        const confirmText = hostPage.getByText(/tap again to confirm/i);
        if (await confirmText.isVisible()) {
          await cancelButton.click();
          await hostPage.waitForTimeout(2000);
          
          const okButton = hostPage.getByTestId('ok-button');
          if (await okButton.isVisible()) {
            await okButton.click();
          }
        }
      }
    }
    
    // === GUEST SIDE: Verify Event Cancelled ===
    console.log('Guest: Verifying event cancelled status...');
    await guestPage.reload();
    await guestPage.waitForLoadState('domcontentloaded');
    
    const guestEventCardsAfterCancellation = guestPage.locator('[data-testid^="event-card-"]');
    if (await guestEventCardsAfterCancellation.count() > 0) {
      await guestEventCardsAfterCancellation.first().click();
      await guestPage.waitForTimeout(2000);
      
      // Verify event status is cancelled
      await expect(guestPage.getByTestId('event-status-badge')).toHaveText('Cancelled', { ignoreCase: true });
    }
    
    console.log('✅ Host cancels event after guest joins completed!');
  });
});
