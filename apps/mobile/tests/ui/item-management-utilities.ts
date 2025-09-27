import { Page, expect } from '@playwright/test';

/**
 * Item Management Test Utilities
 * 
 * This file contains comprehensive utilities for testing item management
 * in potluck events, including creation, assignment, claiming, and rebalancing.
 */

// ============================================================================
// ITEM CREATION UTILITIES
// ============================================================================

export interface ItemTemplate {
  name: string;
  category: 'Main Course' | 'Side Dish' | 'Dessert' | 'Beverage' | 'Appetizer' | 'Salad';
  perGuestQty: number;
  description?: string;
  dietaryTags?: string[];
}

export interface EventWithItems {
  title: string;
  description: string;
  minGuests: number;
  maxGuests: number;
  items: ItemTemplate[];
}

export const ITEM_TEMPLATES = {
  MAIN_COURSE: {
    name: 'Grilled Chicken',
    category: 'Main Course' as const,
    perGuestQty: 0.5,
    description: 'Tender grilled chicken breast',
    dietaryTags: ['gluten-free', 'high-protein']
  },
  SIDE_DISH: {
    name: 'Mashed Potatoes',
    category: 'Side Dish' as const,
    perGuestQty: 0.3,
    description: 'Creamy garlic mashed potatoes',
    dietaryTags: ['vegetarian', 'comfort-food']
  },
  DESSERT: {
    name: 'Chocolate Cake',
    category: 'Dessert' as const,
    perGuestQty: 0.2,
    description: 'Rich chocolate layer cake',
    dietaryTags: ['vegetarian', 'sweet']
  },
  BEVERAGE: {
    name: 'Sparkling Water',
    category: 'Beverage' as const,
    perGuestQty: 1,
    description: 'Refreshing sparkling water',
    dietaryTags: ['vegan', 'low-calorie']
  },
  APPETIZER: {
    name: 'Cheese Platter',
    category: 'Appetizer' as const,
    perGuestQty: 0.1,
    description: 'Assorted artisanal cheeses',
    dietaryTags: ['vegetarian', 'gluten-free']
  },
  SALAD: {
    name: 'Caesar Salad',
    category: 'Salad' as const,
    perGuestQty: 0.4,
    description: 'Classic Caesar salad with croutons',
    dietaryTags: ['vegetarian']
  }
};

export const EVENT_TEMPLATES = {
  SMALL_DINNER: {
    title: 'Small Dinner Party',
    description: 'Intimate dinner for close friends',
    minGuests: 4,
    maxGuests: 8,
    items: [
      ITEM_TEMPLATES.MAIN_COURSE,
      ITEM_TEMPLATES.SIDE_DISH,
      ITEM_TEMPLATES.SALAD,
      ITEM_TEMPLATES.DESSERT
    ]
  },
  LARGE_POTLUCK: {
    title: 'Community Potluck',
    description: 'Large community gathering',
    minGuests: 20,
    maxGuests: 50,
    items: [
      ITEM_TEMPLATES.MAIN_COURSE,
      ITEM_TEMPLATES.MAIN_COURSE, // Multiple main courses
      ITEM_TEMPLATES.SIDE_DISH,
      ITEM_TEMPLATES.SIDE_DISH,
      ITEM_TEMPLATES.SALAD,
      ITEM_TEMPLATES.DESSERT,
      ITEM_TEMPLATES.BEVERAGE,
      ITEM_TEMPLATES.APPETIZER
    ]
  },
  VEGETARIAN_EVENT: {
    title: 'Vegetarian Potluck',
    description: 'Plant-based potluck gathering',
    minGuests: 10,
    maxGuests: 25,
    items: [
      { ...ITEM_TEMPLATES.MAIN_COURSE, name: 'Veggie Burger', dietaryTags: ['vegetarian', 'vegan'] },
      ITEM_TEMPLATES.SIDE_DISH,
      ITEM_TEMPLATES.SALAD,
      ITEM_TEMPLATES.DESSERT,
      ITEM_TEMPLATES.BEVERAGE
    ]
  }
};

// ============================================================================
// ITEM CREATION FUNCTIONS
// ============================================================================

export async function createEventWithItems(
  page: Page,
  eventTemplate: EventWithItems
): Promise<string> {
  console.log(`Creating event with items: ${eventTemplate.title}`);
  
  // Navigate to create event
  await page.getByTestId('create-event-button').click();
  await expect(page.getByTestId('create-event-header')).toBeVisible({ timeout: 10000 });
  
  // Fill basic event details
  await page.getByTestId('event-title-input').fill(eventTemplate.title);
  await page.getByTestId('event-description-input').fill(eventTemplate.description);
  
  // Set guest numbers
  const minGuestsInput = page.locator('input').filter({ hasText: /min/i }).or(page.getByPlaceholder(/min/i)).first();
  const maxGuestsInput = page.locator('input').filter({ hasText: /max/i }).or(page.getByPlaceholder(/max/i)).first();
  
  if (await minGuestsInput.isVisible()) {
    await minGuestsInput.clear();
    await minGuestsInput.fill(eventTemplate.minGuests.toString());
  }
  if (await maxGuestsInput.isVisible()) {
    await maxGuestsInput.clear();
    await maxGuestsInput.fill(eventTemplate.maxGuests.toString());
  }
  
  // Navigate through steps
  await page.getByTestId('next-step-inline').click();
  await page.waitForTimeout(1000);
  
  // Location step
  const locationSearch = page.getByPlaceholder(/search for the perfect spot/i);
  if (await locationSearch.isVisible()) {
    await locationSearch.fill('Central Park');
    await page.waitForTimeout(2000);
    
    const firstSuggestion = page.locator('text=Central Park').first();
    if (await firstSuggestion.isVisible()) {
      await firstSuggestion.click();
      await page.waitForTimeout(1000);
    }
  }
  
  await page.getByTestId('next-step-inline').click();
  await page.waitForTimeout(1000);
  
  // Items step - add all items from template
  for (let i = 0; i < eventTemplate.items.length; i++) {
    const item = eventTemplate.items[i];
    await addItemToEventCreation(page, item, i);
  }
  
  await page.getByTestId('next-step-inline').click();
  await page.waitForTimeout(1000);
  
  // Create the event
  await page.getByTestId('create-event-final-button').click();
  await page.waitForTimeout(3000);
  
  // Handle success dialog
  await page.getByText('OK').click();
  await page.waitForTimeout(2000);
  
  // Navigate to the created event
  const eventCards = page.locator('[data-testid^="event-card-"]');
  if (await eventCards.count() > 0) {
    await eventCards.first().click();
    await page.waitForTimeout(2000);
  }
  
  // Get event ID from URL
  const currentUrl = page.url();
  const eventIdMatch = currentUrl.match(/\/events\/([^/]+)/);
  const eventId = eventIdMatch ? eventIdMatch[1] : '';
  
  console.log(`✅ Event with items created: ${eventTemplate.title} (ID: ${eventId})`);
  return eventId;
}

export async function addItemToEventCreation(
  page: Page,
  item: ItemTemplate,
  index: number = 0
): Promise<void> {
  console.log(`Adding item: ${item.name}`);
  
  // Look for item input fields
  const dishNameInput = page.getByPlaceholder(/Grandma's Famous Mac & Cheese/i).nth(index);
  if (await dishNameInput.isVisible()) {
    await dishNameInput.fill(item.name);
  }
  
  // Set category if available
  const categorySelect = page.getByTestId(`category-select-${index}`);
  if (await categorySelect.isVisible()) {
    await categorySelect.click();
    await page.getByText(item.category).click();
  }
  
  // Set quantity if available
  const quantityInput = page.getByTestId(`quantity-input-${index}`);
  if (await quantityInput.isVisible()) {
    await quantityInput.clear();
    await quantityInput.fill(item.perGuestQty.toString());
  }
  
  // Add another item if this isn't the last one
  const addAnotherButton = page.getByTestId('add-another-item-button');
  if (await addAnotherButton.isVisible() && index < 4) { // Limit to prevent infinite adding
    await addAnotherButton.click();
    await page.waitForTimeout(500);
  }
}

// ============================================================================
// ITEM MANAGEMENT FUNCTIONS
// ============================================================================

export async function navigateToItemsTab(page: Page): Promise<void> {
  console.log('Navigating to Items tab...');
  const itemsTab = page.getByTestId('tab-items');
  if (await itemsTab.isVisible()) {
    await itemsTab.click();
    await page.waitForTimeout(1000);
  } else {
    console.log('⚠️ Items tab not found');
  }
}

export async function addItemToExistingEvent(
  page: Page,
  item: ItemTemplate
): Promise<void> {
  console.log(`Adding item to existing event: ${item.name}`);
  
  await navigateToItemsTab(page);
  
  // Click add item button
  const addItemButton = page.getByTestId('add-item-button');
  if (await addItemButton.isVisible()) {
    await addItemButton.click();
    await page.waitForTimeout(1000);
    
    // Fill item details
    const nameInput = page.getByTestId('item-name-input');
    if (await nameInput.isVisible()) {
      await nameInput.fill(item.name);
    }
    
    // Set category
    const categorySelect = page.getByTestId('item-category-select');
    if (await categorySelect.isVisible()) {
      await categorySelect.click();
      await page.getByText(item.category).click();
    }
    
    // Set quantity
    const quantityInput = page.getByTestId('item-quantity-input');
    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill(item.perGuestQty.toString());
    }
    
    // Save item
    const saveButton = page.getByTestId('save-item-button');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(1000);
    }
    
    console.log(`✅ Item added: ${item.name}`);
  } else {
    console.log('⚠️ Add item button not found');
  }
}

export async function claimItem(
  page: Page,
  itemName: string,
  quantity: number = 1
): Promise<void> {
  console.log(`Claiming ${quantity} of item: ${itemName}`);
  
  await navigateToItemsTab(page);
  
  // Find the item by name
  const itemCard = page.locator(`[data-testid*="item-card-${itemName.toLowerCase().replace(/\s+/g, '-')}"]`);
  if (await itemCard.isVisible()) {
    // Click claim button multiple times for quantity
    const claimButton = itemCard.getByTestId('claim-item-button');
    for (let i = 0; i < quantity; i++) {
      if (await claimButton.isVisible()) {
        await claimButton.click();
        await page.waitForTimeout(500);
      }
    }
    console.log(`✅ Claimed ${quantity} of ${itemName}`);
  } else {
    console.log(`⚠️ Item not found: ${itemName}`);
  }
}

export async function unclaimItem(
  page: Page,
  itemName: string,
  quantity: number = 1
): Promise<void> {
  console.log(`Unclaiming ${quantity} of item: ${itemName}`);
  
  await navigateToItemsTab(page);
  
  // Find the item by name
  const itemCard = page.locator(`[data-testid*="item-card-${itemName.toLowerCase().replace(/\s+/g, '-')}"]`);
  if (await itemCard.isVisible()) {
    // Click unclaim button multiple times for quantity
    const unclaimButton = itemCard.getByTestId('unclaim-item-button');
    for (let i = 0; i < quantity; i++) {
      if (await unclaimButton.isVisible()) {
        await unclaimButton.click();
        await page.waitForTimeout(500);
      }
    }
    console.log(`✅ Unclaimed ${quantity} of ${itemName}`);
  } else {
    console.log(`⚠️ Item not found: ${itemName}`);
  }
}

export async function assignItemToUser(
  page: Page,
  itemName: string,
  userId?: string
): Promise<void> {
  console.log(`Assigning item: ${itemName} to user: ${userId || 'self'}`);
  
  await navigateToItemsTab(page);
  
  // Find the item by name
  const itemCard = page.locator(`[data-testid*="item-card-${itemName.toLowerCase().replace(/\s+/g, '-')}"]`);
  if (await itemCard.isVisible()) {
    // Click assign button
    const assignButton = itemCard.getByTestId('assign-item-button');
    if (await assignButton.isVisible()) {
      await assignButton.click();
      await page.waitForTimeout(1000);
      
      // If specific user ID provided, select that user
      if (userId) {
        const userOption = page.getByTestId(`user-option-${userId}`);
        if (await userOption.isVisible()) {
          await userOption.click();
        }
      }
      
      // Confirm assignment
      const confirmButton = page.getByTestId('confirm-assignment-button');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
      
      console.log(`✅ Item assigned: ${itemName}`);
    } else {
      console.log(`⚠️ Assign button not found for item: ${itemName}`);
    }
  } else {
    console.log(`⚠️ Item not found: ${itemName}`);
  }
}

// ============================================================================
// ITEM VERIFICATION FUNCTIONS
// ============================================================================

export async function verifyItemExists(
  page: Page,
  itemName: string
): Promise<boolean> {
  console.log(`Verifying item exists: ${itemName}`);
  
  await navigateToItemsTab(page);
  
  const itemCard = page.locator(`[data-testid*="item-card-${itemName.toLowerCase().replace(/\s+/g, '-')}"]`);
  const exists = await itemCard.isVisible();
  
  if (exists) {
    console.log(`✅ Item found: ${itemName}`);
  } else {
    console.log(`❌ Item not found: ${itemName}`);
  }
  
  return exists;
}

export async function verifyItemClaimedBy(
  page: Page,
  itemName: string,
  expectedUser: string
): Promise<boolean> {
  console.log(`Verifying item claimed by: ${expectedUser}`);
  
  await navigateToItemsTab(page);
  
  const itemCard = page.locator(`[data-testid*="item-card-${itemName.toLowerCase().replace(/\s+/g, '-')}"]`);
  if (await itemCard.isVisible()) {
    const claimedByText = itemCard.getByTestId('claimed-by-text');
    const isClaimedByUser = await claimedByText.textContent() === expectedUser;
    
    if (isClaimedByUser) {
      console.log(`✅ Item claimed by correct user: ${expectedUser}`);
    } else {
      console.log(`❌ Item not claimed by expected user: ${expectedUser}`);
    }
    
    return isClaimedByUser;
  }
  
  return false;
}

export async function verifyItemQuantity(
  page: Page,
  itemName: string,
  expectedQuantity: number
): Promise<boolean> {
  console.log(`Verifying item quantity: ${expectedQuantity}`);
  
  await navigateToItemsTab(page);
  
  const itemCard = page.locator(`[data-testid*="item-card-${itemName.toLowerCase().replace(/\s+/g, '-')}"]`);
  if (await itemCard.isVisible()) {
    const quantityText = itemCard.getByTestId('item-quantity-text');
    const actualQuantity = parseInt(await quantityText.textContent() || '0');
    const isCorrectQuantity = actualQuantity === expectedQuantity;
    
    if (isCorrectQuantity) {
      console.log(`✅ Item quantity correct: ${expectedQuantity}`);
    } else {
      console.log(`❌ Item quantity incorrect. Expected: ${expectedQuantity}, Actual: ${actualQuantity}`);
    }
    
    return isCorrectQuantity;
  }
  
  return false;
}

export async function verifyAllItemsClaimed(page: Page): Promise<boolean> {
  console.log('Verifying all items are claimed...');
  
  await navigateToItemsTab(page);
  
  const unclaimedItems = page.locator('[data-testid*="item-card-"]').filter({ hasText: /unclaimed/i });
  const unclaimedCount = await unclaimedItems.count();
  
  if (unclaimedCount === 0) {
    console.log('✅ All items are claimed');
    return true;
  } else {
    console.log(`❌ ${unclaimedCount} items are still unclaimed`);
    return false;
  }
}

// ============================================================================
// PARTICIPANT DROPOUT SCENARIOS
// ============================================================================

export async function simulateParticipantDropout(
  page: Page,
  participantName: string
): Promise<void> {
  console.log(`Simulating participant dropout: ${participantName}`);
  
  // Navigate to participants tab
  const participantsTab = page.getByTestId('tab-participants');
  if (await participantsTab.isVisible()) {
    await participantsTab.click();
    await page.waitForTimeout(1000);
    
    // Find participant and remove them
    const participantCard = page.locator(`[data-testid*="participant-${participantName.toLowerCase().replace(/\s+/g, '-')}"]`);
    if (await participantCard.isVisible()) {
      const removeButton = participantCard.getByTestId('remove-participant-button');
      if (await removeButton.isVisible()) {
        await removeButton.click();
        await page.waitForTimeout(1000);
        
        // Confirm removal
        const confirmButton = page.getByTestId('confirm-removal-button');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
        }
        
        console.log(`✅ Participant removed: ${participantName}`);
      }
    }
  }
}

export async function rebalanceItems(page: Page): Promise<void> {
  console.log('Rebalancing items after participant dropout...');
  
  // Navigate to items tab
  await navigateToItemsTab(page);
  
  // Click rebalance button
  const rebalanceButton = page.getByTestId('rebalance-items-button');
  if (await rebalanceButton.isVisible()) {
    await rebalanceButton.click();
    await page.waitForTimeout(2000);
    
    // Confirm rebalancing
    const confirmButton = page.getByTestId('confirm-rebalance-button');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      await page.waitForTimeout(1000);
    }
    
    console.log('✅ Items rebalanced successfully');
  } else {
    console.log('⚠️ Rebalance button not found');
  }
}

// ============================================================================
// MULTI-USER ITEM SCENARIOS
// ============================================================================

export async function setupMultiUserItemScenario(
  hostPage: Page,
  guestPages: Page[],
  eventTemplate: EventWithItems
): Promise<{ eventId: string; hostPage: Page; guestPages: Page[] }> {
  console.log('Setting up multi-user item scenario...');
  
  // Host creates event with items
  const eventId = await createEventWithItems(hostPage, eventTemplate);
  
  // Publish event
  const publishButton = hostPage.getByTestId('action-button-publish');
  if (await publishButton.isVisible()) {
    await publishButton.click();
    await hostPage.waitForTimeout(2000);
  }
  
  // Guests join the event
  for (let i = 0; i < guestPages.length; i++) {
    const guestPage = guestPages[i];
    await guestPage.goto(`${process.env.MOBILE_WEB_URL || 'http://localhost:8081'}/events/${eventId}`);
    await guestPage.waitForLoadState('domcontentloaded');
    
    // Request to join
    const joinButton = guestPage.getByTestId('join-event-button');
    if (await joinButton.isVisible()) {
      await joinButton.click();
      await guestPage.waitForTimeout(1000);
    }
  }
  
  // Host approves all guest requests
  await hostPage.goto(`${process.env.MOBILE_WEB_URL || 'http://localhost:8081'}/events/${eventId}`);
  await hostPage.waitForLoadState('domcontentloaded');
  
  const requestsTab = hostPage.getByTestId('tab-requests');
  if (await requestsTab.isVisible()) {
    await requestsTab.click();
    await hostPage.waitForTimeout(1000);
    
    // Approve all pending requests
    const approveButtons = hostPage.locator('[data-testid*="approve-request-button"]');
    const approveCount = await approveButtons.count();
    
    for (let i = 0; i < approveCount; i++) {
      await approveButtons.nth(i).click();
      await hostPage.waitForTimeout(1000);
    }
  }
  
  console.log('✅ Multi-user item scenario setup complete');
  return { eventId, hostPage, guestPages };
}

// ============================================================================
// EDGE CASE SCENARIOS
// ============================================================================

export async function testItemOverclaiming(
  page: Page,
  itemName: string,
  maxQuantity: number
): Promise<boolean> {
  console.log(`Testing item overclaiming: ${itemName}`);
  
  await navigateToItemsTab(page);
  
  const itemCard = page.locator(`[data-testid*="item-card-${itemName.toLowerCase().replace(/\s+/g, '-')}"]`);
  if (await itemCard.isVisible()) {
    // Try to claim more than available
    const claimButton = itemCard.getByTestId('claim-item-button');
    for (let i = 0; i < maxQuantity + 2; i++) {
      if (await claimButton.isVisible()) {
        await claimButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Check if overclaiming was prevented
    const errorMessage = page.getByTestId('overclaim-error-message');
    const wasPrevented = await errorMessage.isVisible();
    
    if (wasPrevented) {
      console.log('✅ Overclaiming prevented successfully');
    } else {
      console.log('❌ Overclaiming was not prevented');
    }
    
    return wasPrevented;
  }
  
  return false;
}

export async function testItemDeletionWithClaims(
  page: Page,
  itemName: string
): Promise<boolean> {
  console.log(`Testing item deletion with existing claims: ${itemName}`);
  
  await navigateToItemsTab(page);
  
  const itemCard = page.locator(`[data-testid*="item-card-${itemName.toLowerCase().replace(/\s+/g, '-')}"]`);
  if (await itemCard.isVisible()) {
    // Try to delete item
    const deleteButton = itemCard.getByTestId('delete-item-button');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForTimeout(1000);
      
      // Check if deletion was prevented due to claims
      const warningMessage = page.getByTestId('deletion-warning-message');
      const wasPrevented = await warningMessage.isVisible();
      
      if (wasPrevented) {
        console.log('✅ Item deletion prevented due to existing claims');
      } else {
        console.log('❌ Item deletion was not prevented despite claims');
      }
      
      return wasPrevented;
    }
  }
  
  return false;
}