import { test, expect } from '@playwright/test';
import { 
  createEventWithItems, 
  addItemToExistingEvent,
  claimItem,
  unclaimItem,
  verifyItemExists,
  verifyItemClaimedBy,
  navigateToItemsTab,
  EVENT_TEMPLATES,
  ITEM_TEMPLATES
} from './item-management-utilities';
import { loginAsHost, createAndPublishEvent } from './event-test-utilities';

test.describe('Item Management - Basic Functionality', () => {
  test('should create event with multiple items', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.SMALL_DINNER);
    
    // Verify event was created
    expect(eventId).toBeTruthy();
    
    // Navigate to items tab and verify all items exist
    await navigateToItemsTab(page);
    
    for (const item of EVENT_TEMPLATES.SMALL_DINNER.items) {
      await expect(page.getByTestId(`item-card-${item.name.toLowerCase().replace(/\s+/g, '-')}`)).toBeVisible();
    }
  });

  test('should add item to existing event', async ({ page }) => {
    await loginAsHost(page);
    
    // Create basic event first
    const eventId = await createAndPublishEvent(page, 'Test Event', 'Test Description');
    
    // Add item to existing event
    await addItemToExistingEvent(page, ITEM_TEMPLATES.BEVERAGE);
    
    // Verify item was added
    const itemExists = await verifyItemExists(page, ITEM_TEMPLATES.BEVERAGE.name);
    expect(itemExists).toBe(true);
  });

  test('should claim and unclaim items', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.SMALL_DINNER);
    
    // Claim an item
    await claimItem(page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
    
    // Verify item is claimed
    const isClaimed = await verifyItemClaimedBy(page, ITEM_TEMPLATES.MAIN_COURSE.name, 'You');
    expect(isClaimed).toBe(true);
    
    // Unclaim the item
    await unclaimItem(page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
    
    // Verify item is unclaimed
    const isUnclaimed = !(await verifyItemClaimedBy(page, ITEM_TEMPLATES.MAIN_COURSE.name, 'You'));
    expect(isUnclaimed).toBe(true);
  });
});