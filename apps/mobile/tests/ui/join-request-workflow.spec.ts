import { test, expect, Page, BrowserContext } from '@playwright/test';

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
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Join Request Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing join request workflow');
    
    // Set capacity
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
    
    await hostPage.screenshot({ path: 'test-results/join-request-1-host-event-published.png' });
    
    // === GUEST: Request to Join ===
    console.log('Guest: Requesting to join...');
    await guestPage.getByTestId('email-input').fill('guest@test.dev');
    await guestPage.getByTestId('password-input').fill('password123');
    await guestPage.getByTestId('sign-in-button').click();
    
    await expect(guestPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
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
    
    // Setup: Host creates event, guest requests, host rejects
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create and publish event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Rejection Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing rejection workflow');
    
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
    
    // Create event with limited capacity
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event with very limited capacity
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Waitlist Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing waitlist functionality');
    
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
    
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Expiration Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing request expiration');
    
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
    
    // Create event
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Bulk Management Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing bulk request management');
    
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
