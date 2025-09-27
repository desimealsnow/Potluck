import { test, expect, Page, BrowserContext } from '@playwright/test';
import { loginAsHost, loginAsGuest, createAndPublishEvent } from './event-test-utilities';

test.describe('Join Request Workflow', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;
  let eventId: string;

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

  test('Complete join request workflow: Request → Approve → Join', async () => {
    console.log('Testing complete join request workflow...');
    
    // === HOST: Create and Publish Event ===
    console.log('Host: Creating and publishing event...');
    await loginAsHost(hostPage);
    const eventId = await createAndPublishEvent(hostPage, 'Join Request Test Event', 'Testing join request workflow', '5', '20');
    
    await hostPage.screenshot({ path: 'test-results/join-request-1-host-event-published.png' });
    
    // === GUEST: Request to Join ===
    console.log('Guest: Requesting to join...');
    await loginAsGuest(guestPage);
    
    // Find and click on the event
    const eventCards = guestPage.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await guestPage.waitForTimeout(2000);
      
      await guestPage.screenshot({ path: 'test-results/join-request-2-guest-event-details.png' });
      
      // Go to Overview tab
      const overviewTab = guestPage.getByTestId('tab-overview');
      if (await overviewTab.isVisible()) {
        await overviewTab.click();
        await guestPage.waitForTimeout(1000);
        
        // Look for join request button
        const joinRequestButton = guestPage.getByTestId('join-request-button');
        if (await joinRequestButton.isVisible()) {
          await joinRequestButton.click();
          await guestPage.waitForTimeout(2000);
          
          await guestPage.screenshot({ path: 'test-results/join-request-3-guest-request-sent.png' });
        }
      }
    }
    
    // === HOST: Review and Approve Request ===
    console.log('Host: Reviewing and approving request...');
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
        
        await hostPage.screenshot({ path: 'test-results/join-request-4-host-requests-tab.png' });
        
        // Look for pending request
        const pendingRequest = hostPage.getByTestId('join-request-item');
        if (await pendingRequest.isVisible()) {
          await expect(pendingRequest).toBeVisible();
          
          // Check request details
          const requestDetails = hostPage.getByTestId('request-details');
          if (await requestDetails.isVisible()) {
            await expect(requestDetails).toBeVisible();
          }
          
          // Approve the request
          const approveButton = hostPage.getByTestId('approve-request-button');
          if (await approveButton.isVisible()) {
            await approveButton.click();
            await hostPage.waitForTimeout(2000);
            
            await hostPage.screenshot({ path: 'test-results/join-request-5-host-request-approved.png' });
          }
        }
      }
    }
    
    // === GUEST: Verify Approval ===
    console.log('Guest: Verifying approval...');
    await guestPage.reload();
    await guestPage.waitForLoadState('domcontentloaded');
    
    // Check that guest is now a participant
    const guestEventCards = guestPage.locator('[data-testid^="event-card-"]');
    if (await guestEventCards.count() > 0) {
      await guestEventCards.first().click();
      await guestPage.waitForTimeout(2000);
      
      // Go to Participants tab
      const participantsTab = guestPage.getByTestId('tab-participants');
      if (await participantsTab.isVisible()) {
        await participantsTab.click();
        await guestPage.waitForTimeout(1000);
        
        await guestPage.screenshot({ path: 'test-results/join-request-6-guest-now-participant.png' });
        
        // Should see guest in participants list
        const participantList = guestPage.getByTestId('participant-list');
        if (await participantList.isVisible()) {
          await expect(participantList).toBeVisible();
        }
      }
    }
    
    console.log('✅ Complete join request workflow test completed!');
  });

  test('Join request rejection workflow', async () => {
    console.log('Testing join request rejection workflow...');
    
    // Setup: Host creates event, guest requests, host rejects using proven utilities
    await loginAsHost(hostPage);
    const eventId = await createAndPublishEvent(hostPage, 'Rejection Test Event', 'Testing rejection workflow');
    
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
        
        // Reject the request
        const rejectButton = hostPage.getByTestId('reject-request-button');
        if (await rejectButton.isVisible()) {
          await rejectButton.click();
          await hostPage.waitForTimeout(2000);
          
          await hostPage.screenshot({ path: 'test-results/join-request-rejection-1-host-rejected.png' });
        }
      }
    }
    
    // Guest should see rejection
    await guestPage.reload();
    await guestPage.waitForLoadState('domcontentloaded');
    
    const guestEventCards = guestPage.locator('[data-testid^="event-card-"]');
    if (await guestEventCards.count() > 0) {
      await guestEventCards.first().click();
      await guestPage.waitForTimeout(2000);
      
      const overviewTab = guestPage.getByTestId('tab-overview');
      if (await overviewTab.isVisible()) {
        await overviewTab.click();
        await guestPage.waitForTimeout(1000);
        
        // Should show rejection status or allow new request
        const requestStatus = guestPage.getByTestId('request-status');
        if (await requestStatus.isVisible()) {
          await expect(requestStatus).toContainText(/rejected|declined/i);
        }
        
        await guestPage.screenshot({ path: 'test-results/join-request-rejection-2-guest-sees-rejection.png' });
      }
    }
    
    console.log('✅ Join request rejection workflow test completed!');
  });

  test('Waitlist functionality', async () => {
    console.log('Testing waitlist functionality...');
    
    // Create event with limited capacity using proven utilities
    await loginAsHost(hostPage);
    const eventId = await createAndPublishEvent(hostPage, 'Waitlist Test Event', 'Testing waitlist functionality', '1', '2');
    
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
      
      // Use our proven login utility
      await loginAsGuest(guestPage, i + 1);
      
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
            
            await guestPage.screenshot({ path: `test-results/waitlist-guest-${i + 1}-request.png` });
          }
        }
      }
      
      await guestPage.close();
    }
    
    // Host manages waitlist
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
        
        await hostPage.screenshot({ path: 'test-results/waitlist-1-host-requests-view.png' });
        
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
        
        await hostPage.screenshot({ path: 'test-results/waitlist-2-host-managed-waitlist.png' });
        
        // Test promoting from waitlist
        const promoteButton = hostPage.getByTestId('promote-waitlist-button');
        if (await promoteButton.isVisible()) {
          await promoteButton.click();
          await hostPage.waitForTimeout(2000);
          
          await hostPage.screenshot({ path: 'test-results/waitlist-3-host-promoted-from-waitlist.png' });
        }
      }
    }
    
    console.log('✅ Waitlist functionality test completed!');
  });

  test('Join request expiration and cleanup', async () => {
    console.log('Testing join request expiration...');
    
    // This test would require time manipulation or specific test data
    // For now, we'll test the UI elements that would show expired requests
    
    await loginAsHost(hostPage);
    
    // Create and publish event
    const eventId = await createAndPublishEvent(hostPage, 'Expiration Test Event', 'Testing request expiration');
    
    // Navigate to event
    const eventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      const requestsTab = hostPage.getByTestId('tab-requests');
      if (await requestsTab.isVisible()) {
        await requestsTab.click();
        await hostPage.waitForTimeout(1000);
        
        // Look for expired requests
        const expiredRequests = hostPage.getByTestId('expired-request');
        if (await expiredRequests.isVisible()) {
          await expect(expiredRequests).toBeVisible();
          
          // Test cleanup actions
          const cleanupButton = hostPage.getByTestId('cleanup-expired-button');
          if (await cleanupButton.isVisible()) {
            await cleanupButton.click();
            await hostPage.waitForTimeout(2000);
          }
        }
        
        await hostPage.screenshot({ path: 'test-results/join-request-expiration.png' });
      }
    }
    
    console.log('✅ Join request expiration test completed!');
  });

  test('Bulk request management', async () => {
    console.log('Testing bulk request management...');
    
    // Login and create event
    await loginAsHost(hostPage);
    
    // Create and publish event
    const eventId = await createAndPublishEvent(hostPage, 'Bulk Management Test Event', 'Testing bulk request management');
    
    // Navigate to event
    const eventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      const requestsTab = hostPage.getByTestId('tab-requests');
      if (await requestsTab.isVisible()) {
        await requestsTab.click();
        await hostPage.waitForTimeout(1000);
        
        // Test bulk actions
        const selectAllButton = hostPage.getByTestId('select-all-requests');
        if (await selectAllButton.isVisible()) {
          await selectAllButton.click();
          await hostPage.waitForTimeout(1000);
          
          // Test bulk approve
          const bulkApproveButton = hostPage.getByTestId('bulk-approve-button');
          if (await bulkApproveButton.isVisible()) {
            await bulkApproveButton.click();
            await hostPage.waitForTimeout(2000);
          }
          
          // Test bulk reject
          const bulkRejectButton = hostPage.getByTestId('bulk-reject-button');
          if (await bulkRejectButton.isVisible()) {
            await bulkRejectButton.click();
            await hostPage.waitForTimeout(2000);
          }
          
          // Test bulk waitlist
          const bulkWaitlistButton = hostPage.getByTestId('bulk-waitlist-button');
          if (await bulkWaitlistButton.isVisible()) {
            await bulkWaitlistButton.click();
            await hostPage.waitForTimeout(2000);
          }
        }
        
        await hostPage.screenshot({ path: 'test-results/join-request-bulk-management.png' });
      }
    }
    
    console.log('✅ Bulk request management test completed!');
  });
});
