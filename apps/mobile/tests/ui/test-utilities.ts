import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  displayName?: string;
}

export interface TestEvent {
  title: string;
  description: string;
  minGuests?: number;
  maxGuests?: number;
  mealType?: 'veg' | 'nonveg' | 'mixed';
  isPublic?: boolean;
}

export interface TestItem {
  name: string;
  category: string;
  quantity: number;
}

export class PotluckTestUtils {
  constructor(private page: Page) {}

  async login(user: TestUser): Promise<void> {
    await this.page.getByTestId('email-input').fill(user.email);
    await this.page.getByTestId('password-input').fill(user.password);
    await this.page.getByTestId('sign-in-button').click();
    
    await expect(this.page.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
  }

  async logout(): Promise<void> {
    // Implementation depends on logout button location
    const logoutButton = this.page.getByTestId('logout-button');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
  }

  async createEvent(event: TestEvent): Promise<string> {
    await this.page.getByTestId('create-event-button').click();
    await expect(this.page.getByTestId('create-event-header')).toBeVisible({ timeout: 10000 });
    
    // Fill event details
    await this.page.getByTestId('event-title-input').fill(event.title);
    await this.page.getByTestId('event-description-input').fill(event.description);
    
    // Set guest numbers
    if (event.minGuests) {
      const minGuestsInput = this.page.locator('input').filter({ hasText: /min/i }).or(this.page.getByPlaceholder(/min/i)).first();
      if (await minGuestsInput.isVisible()) {
        await minGuestsInput.clear();
        await minGuestsInput.fill(event.minGuests.toString());
      }
    }
    
    if (event.maxGuests) {
      const maxGuestsInput = this.page.locator('input').filter({ hasText: /max/i }).or(this.page.getByPlaceholder(/max/i)).first();
      if (await maxGuestsInput.isVisible()) {
        await maxGuestsInput.clear();
        await maxGuestsInput.fill(event.maxGuests.toString());
      }
    }
    
    // Set meal type
    if (event.mealType) {
      const mealTypeOption = this.page.getByText(event.mealType, { exact: true });
      if (await mealTypeOption.isVisible()) {
        await mealTypeOption.click();
      }
    }
    
    // Navigate through steps
    await this.page.getByTestId('next-step-button').click();
    await this.page.waitForTimeout(1000);
    
    // Location step
    const locationSearch = this.page.getByPlaceholder(/search for the perfect spot/i);
    if (await locationSearch.isVisible()) {
      await locationSearch.fill('Central Park');
      await locationSearch.press('Enter');
      await this.page.waitForTimeout(2000);
    }
    
    await this.page.getByTestId('next-step-button').click();
    await this.page.waitForTimeout(1000);
    
    // Menu step
    const dishNameInput = this.page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).first();
    if (await dishNameInput.isVisible()) {
      await dishNameInput.fill('Test Main Course');
    }
    
    await this.page.getByTestId('next-step-button').click();
    await this.page.waitForTimeout(1000);
    
    // Create event
    await this.page.getByTestId('create-event-final-button').click();
    await this.page.waitForTimeout(3000);
    
    // Return to events list
    await expect(this.page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    
    // Return event ID (extract from URL or page content)
    const currentUrl = this.page.url();
    const eventIdMatch = currentUrl.match(/\/events\/([^\/]+)/);
    return eventIdMatch ? eventIdMatch[1] : 'test-event-id';
  }

  async publishEvent(): Promise<void> {
    const publishButton = this.page.getByTestId('publish-button');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await this.page.waitForTimeout(2000);
      
      // Handle success message
      const okButton = this.page.getByTestId('ok-button');
      if (await okButton.isVisible()) {
        await okButton.click();
      }
    }
  }

  async navigateToEvent(eventIndex: number = 0): Promise<void> {
    const eventCards = this.page.locator('[data-testid^="event-card-"]');
    const cardCount = await eventCards.count();
    
    if (cardCount > eventIndex) {
      await eventCards.nth(eventIndex).click();
      await this.page.waitForTimeout(2000);
    } else {
      throw new Error(`Event at index ${eventIndex} not found`);
    }
  }

  async addItem(item: TestItem): Promise<void> {
    // Go to Items tab
    const itemsTab = this.page.getByTestId('tab-items');
    if (await itemsTab.isVisible()) {
      await itemsTab.click();
      await this.page.waitForTimeout(1000);
    }
    
    // Click on item name picker
    const itemNameInput = this.page.getByTestId('item-name-picker');
    if (await itemNameInput.isVisible()) {
      await itemNameInput.click();
      await this.page.waitForTimeout(500);
      
      // Fill item name
      const nameInput = this.page.getByTestId('item-name-display');
      if (await nameInput.isVisible()) {
        await nameInput.fill(item.name);
      }
      
      // Set category
      const categoryOption = this.page.getByTestId(`category-segmented-option-${item.category}`);
      if (await categoryOption.isVisible()) {
        await categoryOption.click();
      }
      
      // Set quantity
      const quantityInput = this.page.getByTestId('quantity-input');
      if (await quantityInput.isVisible()) {
        await quantityInput.clear();
        await quantityInput.fill(item.quantity.toString());
      }
      
      // Add the item
      const addButton = this.page.getByTestId('add-item-button');
      if (await addButton.isVisible()) {
        await addButton.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async claimItem(itemIndex: number = 0): Promise<void> {
    const claimButton = this.page.getByTestId(/item-increase-/);
    const claimCount = await claimButton.count();
    
    if (claimCount > itemIndex) {
      await claimButton.nth(itemIndex).click();
      await this.page.waitForTimeout(500);
    }
  }

  async unclaimItem(itemIndex: number = 0): Promise<void> {
    const unclaimButton = this.page.getByTestId(/item-decrease-/);
    const unclaimCount = await unclaimButton.count();
    
    if (unclaimCount > itemIndex) {
      await unclaimButton.nth(itemIndex).click();
      await this.page.waitForTimeout(500);
    }
  }

  async requestToJoin(): Promise<void> {
    // Go to Overview tab
    const overviewTab = this.page.getByTestId('tab-overview');
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await this.page.waitForTimeout(1000);
    }
    
    // Click join request button
    const joinRequestButton = this.page.getByTestId('join-request-button');
    if (await joinRequestButton.isVisible()) {
      await joinRequestButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async approveJoinRequest(requestIndex: number = 0): Promise<void> {
    // Go to Requests tab
    const requestsTab = this.page.getByTestId('tab-requests');
    if (await requestsTab.isVisible()) {
      await requestsTab.click();
      await this.page.waitForTimeout(1000);
    }
    
    // Approve request
    const approveButton = this.page.getByTestId('approve-request-button');
    const approveCount = await approveButton.count();
    
    if (approveCount > requestIndex) {
      await approveButton.nth(requestIndex).click();
      await this.page.waitForTimeout(2000);
    }
  }

  async rejectJoinRequest(requestIndex: number = 0): Promise<void> {
    // Go to Requests tab
    const requestsTab = this.page.getByTestId('tab-requests');
    if (await requestsTab.isVisible()) {
      await requestsTab.click();
      await this.page.waitForTimeout(1000);
    }
    
    // Reject request
    const rejectButton = this.page.getByTestId('reject-request-button');
    const rejectCount = await rejectButton.count();
    
    if (rejectCount > requestIndex) {
      await rejectButton.nth(requestIndex).click();
      await this.page.waitForTimeout(2000);
    }
  }

  async waitlistJoinRequest(requestIndex: number = 0): Promise<void> {
    // Go to Requests tab
    const requestsTab = this.page.getByTestId('tab-requests');
    if (await requestsTab.isVisible()) {
      await requestsTab.click();
      await this.page.waitForTimeout(1000);
    }
    
    // Waitlist request
    const waitlistButton = this.page.getByTestId('waitlist-request-button');
    const waitlistCount = await waitlistButton.count();
    
    if (waitlistCount > requestIndex) {
      await waitlistButton.nth(requestIndex).click();
      await this.page.waitForTimeout(2000);
    }
  }

  async cancelEvent(): Promise<void> {
    const cancelButton = this.page.getByTestId('action-button-cancel');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await this.page.waitForTimeout(1000);
      
      // Should show "Tap again to confirm"
      const confirmText = this.page.getByText(/tap again to confirm/i);
      if (await confirmText.isVisible()) {
        await cancelButton.click(); // Confirm cancellation
        await this.page.waitForTimeout(2000);
        
        // Handle success message
        const okButton = this.page.getByTestId('ok-button');
        if (await okButton.isVisible()) {
          await okButton.click();
        }
      }
    }
  }

  async completeEvent(): Promise<void> {
    const completeButton = this.page.getByTestId('action-button-complete');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await this.page.waitForTimeout(1000);
      
      // Should show "Tap again to confirm"
      const confirmText = this.page.getByText(/tap again to confirm/i);
      if (await confirmText.isVisible()) {
        await completeButton.click(); // Confirm completion
        await this.page.waitForTimeout(2000);
        
        // Handle success message
        const okButton = this.page.getByTestId('ok-button');
        if (await okButton.isVisible()) {
          await okButton.click();
        }
      }
    }
  }

  async deleteEvent(): Promise<void> {
    const deleteButton = this.page.getByTestId('action-button-purge');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await this.page.waitForTimeout(1000);
      
      // Should show "Tap again to confirm"
      const confirmText = this.page.getByText(/tap again to confirm/i);
      if (await confirmText.isVisible()) {
        await deleteButton.click(); // Confirm deletion
        await this.page.waitForTimeout(2000);
        
        // Handle success message
        const okButton = this.page.getByTestId('ok-button');
        if (await okButton.isVisible()) {
          await okButton.click();
        }
      }
    }
  }

  async restoreEvent(): Promise<void> {
    const restoreButton = this.page.getByTestId('action-button-restore');
    if (await restoreButton.isVisible()) {
      await restoreButton.click();
      await this.page.waitForTimeout(1000);
      
      // Should show "Tap again to confirm"
      const confirmText = this.page.getByText(/tap again to confirm/i);
      if (await confirmText.isVisible()) {
        await restoreButton.click(); // Confirm restoration
        await this.page.waitForTimeout(2000);
        
        // Handle success message
        const okButton = this.page.getByTestId('ok-button');
        if (await okButton.isVisible()) {
          await okButton.click();
        }
      }
    }
  }

  async switchToTab(tabName: 'overview' | 'items' | 'participants' | 'requests'): Promise<void> {
    const tab = this.page.getByTestId(`tab-${tabName}`);
    if (await tab.isVisible()) {
      await tab.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async waitForLoadingToComplete(): Promise<void> {
    await this.page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 15000 });
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }

  async expectElementToBeVisible(testId: string): Promise<void> {
    await expect(this.page.getByTestId(testId)).toBeVisible();
  }

  async expectElementToContainText(testId: string, text: string): Promise<void> {
    await expect(this.page.getByTestId(testId)).toContainText(text);
  }

  async expectElementToHaveCount(testId: string, count: number): Promise<void> {
    await expect(this.page.getByTestId(testId)).toHaveCount(count);
  }
}

// Predefined test users
export const TEST_USERS = {
  HOST: {
    email: 'host@test.dev',
    password: 'password123',
    displayName: 'Test Host'
  },
  GUEST: {
    email: 'guest@test.dev',
    password: 'password123',
    displayName: 'Test Guest'
  },
  GUEST_2: {
    email: 'guest2@test.dev',
    password: 'password123',
    displayName: 'Test Guest 2'
  },
  GUEST_3: {
    email: 'guest3@test.dev',
    password: 'password123',
    displayName: 'Test Guest 3'
  }
};

// Predefined test events
export const TEST_EVENTS = {
  BASIC: {
    title: 'Basic Test Event',
    description: 'A basic test event for automated testing',
    minGuests: 5,
    maxGuests: 25,
    mealType: 'mixed' as const,
    isPublic: true
  },
  LIMITED_CAPACITY: {
    title: 'Limited Capacity Event',
    description: 'An event with very limited capacity for testing',
    minGuests: 1,
    maxGuests: 3,
    mealType: 'veg' as const,
    isPublic: true
  },
  LARGE_EVENT: {
    title: 'Large Test Event',
    description: 'A large event for testing performance',
    minGuests: 50,
    maxGuests: 200,
    mealType: 'mixed' as const,
    isPublic: true
  }
};

// Predefined test items
export const TEST_ITEMS = {
  MAIN_COURSE: {
    name: 'Test Main Course',
    category: 'Main Course',
    quantity: 1
  },
  SIDE_DISH: {
    name: 'Test Side Dish',
    category: 'Side Dish',
    quantity: 2
  },
  DESSERT: {
    name: 'Test Dessert',
    category: 'Dessert',
    quantity: 1
  },
  BEVERAGE: {
    name: 'Test Beverage',
    category: 'Beverage',
    quantity: 3
  }
};

// Helper functions for common test scenarios
export async function setupHostAndGuest(
  hostPage: Page,
  guestPage: Page,
  event: TestEvent = TEST_EVENTS.BASIC
): Promise<{ eventId: string; hostUtils: PotluckTestUtils; guestUtils: PotluckTestUtils }> {
  const hostUtils = new PotluckTestUtils(hostPage);
  const guestUtils = new PotluckTestUtils(guestPage);
  
  // Host login and create event
  await hostUtils.login(TEST_USERS.HOST);
  const eventId = await hostUtils.createEvent(event);
  await hostUtils.publishEvent();
  
  // Guest login
  await guestUtils.login(TEST_USERS.GUEST);
  
  return { eventId, hostUtils, guestUtils };
}

export async function createEventWithItems(
  hostUtils: PotluckTestUtils,
  event: TestEvent = TEST_EVENTS.BASIC,
  items: TestItem[] = [TEST_ITEMS.MAIN_COURSE, TEST_ITEMS.SIDE_DISH]
): Promise<string> {
  const eventId = await hostUtils.createEvent(event);
  await hostUtils.publishEvent();
  
  // Navigate to event and add items
  await hostUtils.navigateToEvent();
  await hostUtils.switchToTab('items');
  
  for (const item of items) {
    await hostUtils.addItem(item);
  }
  
  return eventId;
}

export async function simulateMultipleGuestsJoining(
  guestContext: BrowserContext,
  guestCount: number = 3
): Promise<void> {
  const guestPromises = [];
  
  for (let i = 0; i < guestCount; i++) {
    const guestPage = await guestContext.newPage();
    const guestUtils = new PotluckTestUtils(guestPage);
    
    guestPromises.push(
      guestUtils.login({
        email: `guest${i + 1}@test.dev`,
        password: 'password123'
      }).then(() => guestUtils.requestToJoin())
    );
  }
  
  await Promise.all(guestPromises);
}

export async function waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

export async function clearAllData(page: Page): Promise<void> {
  // Clear localStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Clear cookies
  await page.context().clearCookies();
}
