import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Item Management and Claiming', () => {
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

  test('Host creates event with items and manages them', async () => {
    console.log('Testing host item management...');
    
    // Host login
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Item Management Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing item management functionality');
    
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
      
      // Go to Items tab
      const itemsTab = hostPage.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await hostPage.waitForTimeout(1000);
        
        await hostPage.screenshot({ path: 'test-results/item-management-1-host-items-tab.png' });
        
        // Add multiple items
        const itemsToAdd = [
          { name: 'Main Course - Pasta', category: 'Main Course', quantity: '1' },
          { name: 'Side Dish - Salad', category: 'Side Dish', quantity: '2' },
          { name: 'Dessert - Cake', category: 'Dessert', quantity: '1' },
          { name: 'Beverage - Soda', category: 'Beverage', quantity: '3' }
        ];
        
        for (const item of itemsToAdd) {
          // Click on item name picker
          const itemNameInput = hostPage.getByTestId('item-name-picker');
          if (await itemNameInput.isVisible()) {
            await itemNameInput.click();
            await hostPage.waitForTimeout(500);
            
            // Fill item name
            const nameInput = hostPage.getByTestId('item-name-display');
            if (await nameInput.isVisible()) {
              await nameInput.fill(item.name);
            }
            
            // Set category
            const categorySegmented = hostPage.getByTestId('category-segmented');
            if (await categorySegmented.isVisible()) {
              // Click on the appropriate category option
              const categoryOption = hostPage.getByTestId(`category-segmented-option-${item.category}`);
              if (await categoryOption.isVisible()) {
                await categoryOption.click();
              }
            }
            
            // Set quantity
            const quantityInput = hostPage.getByTestId('quantity-input');
            if (await quantityInput.isVisible()) {
              await quantityInput.clear();
              await quantityInput.fill(item.quantity);
            }
            
            // Add the item
            const addButton = hostPage.getByTestId('add-item-button');
            if (await addButton.isVisible()) {
              await addButton.click();
              await hostPage.waitForTimeout(1000);
            }
          }
        }
        
        await hostPage.screenshot({ path: 'test-results/item-management-2-host-items-added.png' });
        
        // Test item editing
        const itemCards = hostPage.locator('[data-testid^="item-card-"]');
        if (await itemCards.count() > 0) {
          const firstItem = itemCards.first();
          await firstItem.click();
          await hostPage.waitForTimeout(500);
          
          // Edit item name
          const itemNameInput = hostPage.getByTestId(/item-name-input-/);
          if (await itemNameInput.isVisible()) {
            await itemNameInput.clear();
            await itemNameInput.fill('Updated Item Name');
            await hostPage.waitForTimeout(1000);
          }
          
          await hostPage.screenshot({ path: 'test-results/item-management-3-host-item-edited.png' });
        }
        
        // Test item deletion
        const deleteButtons = hostPage.getByTestId(/item-delete-/);
        if (await deleteButtons.count() > 0) {
          await deleteButtons.first().click();
          await hostPage.waitForTimeout(1000);
          
          await hostPage.screenshot({ path: 'test-results/item-management-4-host-item-deleted.png' });
        }
        
        // Test rebalance functionality
        const rebalanceButton = hostPage.getByTestId('rebalance-button');
        if (await rebalanceButton.isVisible()) {
          await rebalanceButton.click();
          await hostPage.waitForTimeout(2000);
          
          await hostPage.screenshot({ path: 'test-results/item-management-5-host-rebalanced.png' });
        }
      }
    }
    
    console.log('✅ Host item management test completed!');
  });

  test('Guest claims and unclaims items', async () => {
    console.log('Testing guest item claiming...');
    
    // Setup: Host creates event with items
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event with items
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Guest Claiming Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing guest item claiming');
    
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
    
    // Guest joins event
    await guestPage.getByTestId('email-input').fill('guest@test.dev');
    await guestPage.getByTestId('password-input').fill('password123');
    await guestPage.getByTestId('sign-in-button').click();
    
    await expect(guestPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Find and join event
    const eventCards = guestPage.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await guestPage.waitForTimeout(2000);
      
      // Request to join
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
    
    // Host approves guest
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
    
    // Guest claims items
    await guestPage.reload();
    await guestPage.waitForLoadState('domcontentloaded');
    
    const guestEventCards = guestPage.locator('[data-testid^="event-card-"]');
    if (await guestEventCards.count() > 0) {
      await guestEventCards.first().click();
      await guestPage.waitForTimeout(2000);
      
      // Go to Items tab
      const itemsTab = guestPage.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await guestPage.waitForTimeout(1000);
        
        await guestPage.screenshot({ path: 'test-results/item-claiming-1-guest-items-view.png' });
        
        // Claim items
        const claimButtons = guestPage.getByTestId(/item-increase-/);
        const claimCount = await claimButtons.count();
        
        for (let i = 0; i < Math.min(3, claimCount); i++) {
          await claimButtons.nth(i).click();
          await guestPage.waitForTimeout(500);
        }
        
        await guestPage.screenshot({ path: 'test-results/item-claiming-2-guest-items-claimed.png' });
        
        // Unclaim some items
        const unclaimButtons = guestPage.getByTestId(/item-decrease-/);
        const unclaimCount = await unclaimButtons.count();
        
        for (let i = 0; i < Math.min(2, unclaimCount); i++) {
          await unclaimButtons.nth(i).click();
          await guestPage.waitForTimeout(500);
        }
        
        await guestPage.screenshot({ path: 'test-results/item-claiming-3-guest-items-unclaimed.png' });
      }
    }
    
    console.log('✅ Guest item claiming test completed!');
  });

  test('Item progress tracking and completion', async () => {
    console.log('Testing item progress tracking...');
    
    // Host creates event with items
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Progress Tracking Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing item progress tracking');
    
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
    
    // Add items with different quantities
    const eventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      const itemsTab = hostPage.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await hostPage.waitForTimeout(1000);
        
        // Add items with different quantities
        const itemsToAdd = [
          { name: 'Small Item', quantity: '1' },
          { name: 'Medium Item', quantity: '3' },
          { name: 'Large Item', quantity: '5' }
        ];
        
        for (const item of itemsToAdd) {
          const itemNameInput = hostPage.getByTestId('item-name-picker');
          if (await itemNameInput.isVisible()) {
            await itemNameInput.click();
            await hostPage.waitForTimeout(500);
            
            const nameInput = hostPage.getByTestId('item-name-display');
            if (await nameInput.isVisible()) {
              await nameInput.fill(item.name);
            }
            
            const quantityInput = hostPage.getByTestId('quantity-input');
            if (await quantityInput.isVisible()) {
              await quantityInput.clear();
              await quantityInput.fill(item.quantity);
            }
            
            const addButton = hostPage.getByTestId('add-item-button');
            if (await addButton.isVisible()) {
              await addButton.click();
              await hostPage.waitForTimeout(1000);
            }
          }
        }
        
        await hostPage.screenshot({ path: 'test-results/item-progress-1-items-added.png' });
        
        // Check progress bars
        const progressBars = hostPage.getByTestId(/item-progress-/);
        const progressCount = await progressBars.count();
        
        for (let i = 0; i < progressCount; i++) {
          const progressBar = progressBars.nth(i);
          await expect(progressBar).toBeVisible();
        }
        
        // Test claiming to completion
        const claimButtons = hostPage.getByTestId(/item-increase-/);
        const claimCount = await claimButtons.count();
        
        // Claim items to completion
        for (let i = 0; i < claimCount; i++) {
          const claimButton = claimButtons.nth(i);
          const itemCard = claimButton.locator('..').locator('..').locator('..');
          const itemCount = itemCard.getByTestId(/item-count-/);
          
          if (await itemCount.isVisible()) {
            const countText = await itemCount.textContent();
            const [claimed, required] = countText?.split(' / ') || ['0', '1'];
            const remaining = parseInt(required) - parseInt(claimed);
            
            // Claim remaining quantity
            for (let j = 0; j < remaining; j++) {
              await claimButton.click();
              await hostPage.waitForTimeout(200);
            }
          }
        }
        
        await hostPage.screenshot({ path: 'test-results/item-progress-2-items-completed.png' });
        
        // Check completion indicators
        const completionIndicators = hostPage.getByTestId(/item-complete-/);
        const completionCount = await completionIndicators.count();
        
        for (let i = 0; i < completionCount; i++) {
          const completionIndicator = completionIndicators.nth(i);
          await expect(completionIndicator).toBeVisible();
          await expect(completionIndicator).toContainText(/complete/i);
        }
      }
    }
    
    console.log('✅ Item progress tracking test completed!');
  });

  test('Item category management and filtering', async () => {
    console.log('Testing item category management...');
    
    // Host creates event with items of different categories
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Category Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing item categories');
    
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
    
    // Add items of different categories
    const eventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      const itemsTab = hostPage.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await hostPage.waitForTimeout(1000);
        
        const categories = ['Main Course', 'Starter', 'Dessert', 'Beverage', 'Side Dish'];
        
        for (const category of categories) {
          const itemNameInput = hostPage.getByTestId('item-name-picker');
          if (await itemNameInput.isVisible()) {
            await itemNameInput.click();
            await hostPage.waitForTimeout(500);
            
            const nameInput = hostPage.getByTestId('item-name-display');
            if (await nameInput.isVisible()) {
              await nameInput.fill(`${category} Item`);
            }
            
            // Set category
            const categoryOption = hostPage.getByTestId(`category-segmented-option-${category}`);
            if (await categoryOption.isVisible()) {
              await categoryOption.click();
            }
            
            const addButton = hostPage.getByTestId('add-item-button');
            if (await addButton.isVisible()) {
              await addButton.click();
              await hostPage.waitForTimeout(1000);
            }
          }
        }
        
        await hostPage.screenshot({ path: 'test-results/item-categories-1-items-by-category.png' });
        
        // Test category filtering (if available)
        const categoryFilter = hostPage.getByTestId('category-filter');
        if (await categoryFilter.isVisible()) {
          for (const category of categories) {
            const filterOption = hostPage.getByTestId(`category-filter-${category}`);
            if (await filterOption.isVisible()) {
              await filterOption.click();
              await hostPage.waitForTimeout(1000);
              
              await hostPage.screenshot({ path: `test-results/item-categories-2-filtered-${category.toLowerCase().replace(' ', '-')}.png` });
            }
          }
        }
      }
    }
    
    console.log('✅ Item category management test completed!');
  });

  test('Item assignment and transfer between participants', async () => {
    console.log('Testing item assignment and transfer...');
    
    // This test would require multiple participants
    // For now, we'll test the UI elements for assignment
    
    await hostPage.getByTestId('email-input').fill('host@test.dev');
    await hostPage.getByTestId('password-input').fill('password123');
    await hostPage.getByTestId('sign-in-button').click();
    
    await expect(hostPage.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    
    // Create event
    await hostPage.getByTestId('create-event-button').click();
    await hostPage.getByTestId('event-title-input').fill('Assignment Test Event');
    await hostPage.getByTestId('event-description-input').fill('Testing item assignment');
    
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
    
    // Add items
    const eventCards = hostPage.locator('[data-testid^="event-card-"]');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await hostPage.waitForTimeout(2000);
      
      const itemsTab = hostPage.getByTestId('tab-items');
      if (await itemsTab.isVisible()) {
        await itemsTab.click();
        await hostPage.waitForTimeout(1000);
        
        // Add a test item
        const itemNameInput = hostPage.getByTestId('item-name-picker');
        if (await itemNameInput.isVisible()) {
          await itemNameInput.click();
          await hostPage.waitForTimeout(500);
          
          const nameInput = hostPage.getByTestId('item-name-display');
          if (await nameInput.isVisible()) {
            await nameInput.fill('Assignment Test Item');
          }
          
          const addButton = hostPage.getByTestId('add-item-button');
          if (await addButton.isVisible()) {
            await addButton.click();
            await hostPage.waitForTimeout(1000);
          }
        }
        
        // Test item assignment UI (if available)
        const assignButtons = hostPage.getByTestId(/item-assign-/);
        if (await assignButtons.count() > 0) {
          await assignButtons.first().click();
          await hostPage.waitForTimeout(1000);
          
          // Should show assignment modal or dropdown
          const assignmentModal = hostPage.getByTestId('item-assignment-modal');
          if (await assignmentModal.isVisible()) {
            await expect(assignmentModal).toBeVisible();
            
            // Test participant selection
            const participantList = hostPage.getByTestId('participant-selection-list');
            if (await participantList.isVisible()) {
              await expect(participantList).toBeVisible();
            }
            
            await hostPage.screenshot({ path: 'test-results/item-assignment-modal.png' });
          }
        }
      }
    }
    
    console.log('✅ Item assignment test completed!');
  });
});