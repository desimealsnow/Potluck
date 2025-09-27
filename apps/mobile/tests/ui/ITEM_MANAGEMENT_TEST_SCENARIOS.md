# Item Management Test Scenarios - Comprehensive Guide

## Overview

This document outlines comprehensive test scenarios for item management in potluck events, covering all aspects from creation to participant dropouts and edge cases.

## 🎯 Test Categories

### 1. Basic Item Management
- **Item Creation**: Create events with multiple items
- **Item Addition**: Add items to existing events
- **Item Editing**: Modify item details
- **Item Deletion**: Remove items (with validation)
- **Item Validation**: Test input validation and error handling

### 2. Item Assignment and Claiming
- **Single User Claims**: One user claiming multiple items
- **Multi-User Claims**: Multiple users claiming different items
- **Concurrent Claims**: Simultaneous claiming of same item
- **Quantity Management**: Adjusting item quantities
- **Claim Status**: Tracking who claimed what

### 3. Participant Dropout Scenarios
- **Single Dropout**: One participant leaving
- **Multiple Dropouts**: Several participants leaving
- **Partial Claims**: Handling partial item claims
- **Rebalancing**: Redistributing items after dropouts
- **Status Updates**: Updating item status after changes

### 4. Multi-User Interactions
- **Host-Guest Flow**: Host creates, guests claim
- **Guest-Guest Flow**: Multiple guests interacting
- **Real-time Updates**: Live updates across users
- **Conflict Resolution**: Handling simultaneous actions

### 5. Edge Cases and Error Handling
- **Overclaiming Prevention**: Preventing more claims than available
- **Network Errors**: Handling API failures
- **Invalid Data**: Testing with bad input
- **Concurrent Modifications**: Simultaneous edits
- **Boundary Conditions**: Testing limits and constraints

## 🏗️ Test Architecture

### Utility Files
- **`item-management-utilities.ts`**: Core item management functions
- **`event-test-utilities.ts`**: Enhanced with item creation
- **`test-utilities.ts`**: Test data and constants

### Test Files
- **`item-management-basic.spec.ts`**: Basic functionality tests
- **`item-management-multi-user.spec.ts`**: Multi-user scenarios
- **`item-management-dropout.spec.ts`**: Dropout and rebalancing
- **`item-management-edge-cases.spec.ts`**: Edge cases and errors
- **`item-management-real-world.spec.ts`**: Real-world scenarios

## 📋 Test Scenarios

### Basic Item Management

#### 1.1 Event Creation with Items
```typescript
test('should create event with multiple items', async ({ page }) => {
  await loginAsHost(page);
  const eventId = await createEventWithItems(page, EVENT_TEMPLATES.SMALL_DINNER);
  
  // Verify all items were created
  for (const item of EVENT_TEMPLATES.SMALL_DINNER.items) {
    await expect(page.getByTestId(`item-card-${item.name}`)).toBeVisible();
  }
});
```

#### 1.2 Item Addition to Existing Event
```typescript
test('should add item to existing event', async ({ page }) => {
  await loginAsHost(page);
  const eventId = await createAndPublishEvent(page, 'Test Event', 'Description');
  
  await addItemToExistingEvent(page, ITEM_TEMPLATES.BEVERAGE);
  const itemExists = await verifyItemExists(page, ITEM_TEMPLATES.BEVERAGE.name);
  expect(itemExists).toBe(true);
});
```

#### 1.3 Item Claiming and Unclaiming
```typescript
test('should claim and unclaim items', async ({ page }) => {
  await loginAsHost(page);
  const eventId = await createEventWithItems(page, EVENT_TEMPLATES.SMALL_DINNER);
  
  // Claim item
  await claimItem(page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
  const isClaimed = await verifyItemClaimedBy(page, ITEM_TEMPLATES.MAIN_COURSE.name, 'You');
  expect(isClaimed).toBe(true);
  
  // Unclaim item
  await unclaimItem(page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
  const isUnclaimed = !(await verifyItemClaimedBy(page, ITEM_TEMPLATES.MAIN_COURSE.name, 'You'));
  expect(isUnclaimed).toBe(true);
});
```

### Multi-User Scenarios

#### 2.1 Multiple Guests Claiming Different Items
```typescript
test('should handle multiple guests claiming different items', async ({ browser }) => {
  const { hostPage, guest1Page, guest2Page } = await setupMultiUserScenario();
  
  // Guest 1 claims main course
  await claimItem(guest1Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
  
  // Guest 2 claims side dish
  await claimItem(guest2Page, ITEM_TEMPLATES.SIDE_DISH.name, 1);
  
  // Verify claims from host perspective
  const mainCourseClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1');
  const sideDishClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.SIDE_DISH.name, 'Guest 2');
  
  expect(mainCourseClaimed).toBe(true);
  expect(sideDishClaimed).toBe(true);
});
```

#### 2.2 Concurrent Item Claiming
```typescript
test('should handle concurrent item claiming', async ({ browser }) => {
  const { hostPage, guest1Page, guest2Page } = await setupMultiUserScenario();
  
  // Both guests try to claim the same item simultaneously
  const claimPromises = [
    claimItem(guest1Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1),
    claimItem(guest2Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1)
  ];
  
  await Promise.all(claimPromises);
  
  // Only one should succeed
  const totalClaims = (await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1') ? 1 : 0) +
                     (await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 2') ? 1 : 0);
  expect(totalClaims).toBe(1);
});
```

### Participant Dropout Scenarios

#### 3.1 Single Participant Dropout
```typescript
test('should handle participant dropout and item rebalancing', async ({ browser }) => {
  const { hostPage, guest1Page, guest2Page } = await setupMultiUserScenario();
  
  // Guests claim items
  await claimItem(guest1Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
  await claimItem(guest2Page, ITEM_TEMPLATES.SIDE_DISH.name, 1);
  
  // Guest 1 drops out
  await simulateParticipantDropout(hostPage, 'Guest 1');
  
  // Verify item is unclaimed
  const mainCourseUnclaimed = !(await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1'));
  expect(mainCourseUnclaimed).toBe(true);
  
  // Rebalance items
  await rebalanceItems(hostPage);
});
```

#### 3.2 Multiple Participant Dropouts
```typescript
test('should handle multiple participant dropouts', async ({ browser }) => {
  const { hostPage, guest1Page, guest2Page, guest3Page } = await setupMultiUserScenario();
  
  // All guests claim different items
  await claimItem(guest1Page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
  await claimItem(guest2Page, ITEM_TEMPLATES.SIDE_DISH.name, 1);
  await claimItem(guest3Page, ITEM_TEMPLATES.DESSERT.name, 1);
  
  // Multiple dropouts
  await simulateParticipantDropout(hostPage, 'Guest 1');
  await simulateParticipantDropout(hostPage, 'Guest 2');
  
  // Verify items are unclaimed
  const mainCourseUnclaimed = !(await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name, 'Guest 1'));
  const sideDishUnclaimed = !(await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.SIDE_DISH.name, 'Guest 2'));
  const dessertStillClaimed = await verifyItemClaimedBy(hostPage, ITEM_TEMPLATES.DESSERT.name, 'Guest 3');
  
  expect(mainCourseUnclaimed).toBe(true);
  expect(sideDishUnclaimed).toBe(true);
  expect(dessertStillClaimed).toBe(true);
});
```

### Edge Cases and Error Handling

#### 4.1 Overclaiming Prevention
```typescript
test('should prevent item overclaiming', async ({ page }) => {
  await loginAsHost(page);
  const eventId = await createAndPublishEvent(page, 'Test Event', 'Description');
  
  const overclaimingPrevented = await testItemOverclaiming(page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
  expect(overclaimingPrevented).toBe(true);
});
```

#### 4.2 Item Deletion with Claims
```typescript
test('should prevent item deletion with existing claims', async ({ browser }) => {
  const { hostPage, guestPage } = await setupMultiUserScenario();
  
  // Guest claims an item
  await claimItem(guestPage, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
  
  // Try to delete the claimed item
  const deletionPrevented = await testItemDeletionWithClaims(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name);
  expect(deletionPrevented).toBe(true);
});
```

#### 4.3 Network Error Handling
```typescript
test('should handle network errors during item operations', async ({ page }) => {
  await loginAsHost(page);
  
  // Simulate network error
  await page.route('**/api/v1/events/*/items', route => {
    route.abort('failed');
  });
  
  const eventId = await createAndPublishEvent(page, 'Test Event', 'Description');
  
  // Try to add item with network error
  await navigateToItemsTab(page);
  await page.getByTestId('add-item-button').click();
  
  // Verify error handling
  const errorMessage = page.getByTestId('error-message');
  const hasError = await errorMessage.isVisible();
  expect(hasError).toBe(true);
});
```

### Real-World Scenarios

#### 5.1 Vegetarian Potluck Event
```typescript
test('should handle vegetarian potluck event', async ({ page }) => {
  await loginAsHost(page);
  const eventId = await createEventWithItems(page, EVENT_TEMPLATES.VEGETARIAN_EVENT);
  
  // Verify all items are vegetarian
  await navigateToItemsTab(page);
  
  for (const item of EVENT_TEMPLATES.VEGETARIAN_EVENT.items) {
    const itemCard = page.locator(`[data-testid*="item-card-${item.name}"]`);
    const dietaryTags = itemCard.getByTestId('dietary-tags');
    const tagsText = await dietaryTags.textContent();
    expect(tagsText).toContain('vegetarian');
  }
});
```

#### 5.2 Large Potluck with Many Items
```typescript
test('should handle large potluck with many items', async ({ page }) => {
  await loginAsHost(page);
  const eventId = await createEventWithItems(page, EVENT_TEMPLATES.LARGE_POTLUCK);
  
  // Verify all items were created
  await navigateToItemsTab(page);
  const itemCards = page.locator('[data-testid*="item-card-"]');
  const itemCount = await itemCards.count();
  
  expect(itemCount).toBe(EVENT_TEMPLATES.LARGE_POTLUCK.items.length);
});
```

## 🔧 Test Utilities

### Item Templates
```typescript
export const ITEM_TEMPLATES = {
  MAIN_COURSE: {
    name: 'Grilled Chicken',
    category: 'Main Course',
    perGuestQty: 0.5,
    dietaryTags: ['gluten-free', 'high-protein']
  },
  SIDE_DISH: {
    name: 'Mashed Potatoes',
    category: 'Side Dish',
    perGuestQty: 0.3,
    dietaryTags: ['vegetarian', 'comfort-food']
  }
  // ... more templates
};
```

### Event Templates
```typescript
export const EVENT_TEMPLATES = {
  SMALL_DINNER: {
    title: 'Small Dinner Party',
    description: 'Intimate dinner for close friends',
    minGuests: 4,
    maxGuests: 8,
    items: [MAIN_COURSE, SIDE_DISH, SALAD, DESSERT]
  },
  LARGE_POTLUCK: {
    title: 'Community Potluck',
    description: 'Large community gathering',
    minGuests: 20,
    maxGuests: 50,
    items: [MAIN_COURSE, MAIN_COURSE, SIDE_DISH, SIDE_DISH, SALAD, DESSERT, BEVERAGE, APPETIZER]
  }
  // ... more templates
};
```

### Utility Functions
```typescript
// Item creation
export async function createEventWithItems(page: Page, eventTemplate: EventWithItems): Promise<string>

// Item management
export async function addItemToExistingEvent(page: Page, item: ItemTemplate): Promise<void>
export async function claimItem(page: Page, itemName: string, quantity: number): Promise<void>
export async function unclaimItem(page: Page, itemName: string, quantity: number): Promise<void>

// Verification
export async function verifyItemExists(page: Page, itemName: string): Promise<boolean>
export async function verifyItemClaimedBy(page: Page, itemName: string, expectedUser: string): Promise<boolean>
export async function verifyItemQuantity(page: Page, itemName: string, expectedQuantity: number): Promise<boolean>

// Dropout scenarios
export async function simulateParticipantDropout(page: Page, participantName: string): Promise<void>
export async function rebalanceItems(page: Page): Promise<void>

// Multi-user scenarios
export async function setupMultiUserItemScenario(hostPage: Page, guestPages: Page[], eventTemplate: EventWithItems): Promise<{eventId: string, hostPage: Page, guestPages: Page[]}>
```

## 🚀 Running the Tests

### Basic Item Management Tests
```bash
npx playwright test item-management-basic.spec.ts
```

### Multi-User Scenarios
```bash
npx playwright test item-management-multi-user.spec.ts
```

### Dropout Scenarios
```bash
npx playwright test item-management-dropout.spec.ts
```

### Edge Cases
```bash
npx playwright test item-management-edge-cases.spec.ts
```

### Real-World Scenarios
```bash
npx playwright test item-management-real-world.spec.ts
```

### All Item Management Tests
```bash
npx playwright test item-management-*.spec.ts
```

## 📊 Test Coverage

### Functional Coverage
- ✅ Item creation and management
- ✅ Item assignment and claiming
- ✅ Participant dropout handling
- ✅ Multi-user interactions
- ✅ Edge cases and error handling
- ✅ Real-world scenarios

### User Journey Coverage
- ✅ Host creates event with items
- ✅ Guests join and claim items
- ✅ Participants drop out
- ✅ Items are rebalanced
- ✅ Error conditions are handled

### Technical Coverage
- ✅ API integration
- ✅ Database operations
- ✅ Real-time updates
- ✅ Concurrent operations
- ✅ Network error handling
- ✅ Input validation

## 🎯 Key Test Scenarios

### Critical Paths
1. **Host creates event with items** → **Guests join** → **Guests claim items** → **Event completes**
2. **Host creates event** → **Guest claims item** → **Guest drops out** → **Item is released** → **Other guest claims item**
3. **Host creates event** → **Multiple guests claim same item** → **Only one succeeds** → **Others get error**

### Edge Cases
1. **Overclaiming prevention**: Try to claim more than available
2. **Concurrent modifications**: Multiple users editing simultaneously
3. **Network failures**: API calls fail during operations
4. **Invalid data**: Submit malformed item data
5. **Boundary conditions**: Test with minimum/maximum values

### Real-World Scenarios
1. **Vegetarian potluck**: All items must be vegetarian
2. **Large community event**: Many items, many participants
3. **Small dinner party**: Few items, intimate gathering
4. **Mixed dietary restrictions**: Various dietary needs
5. **Last-minute changes**: Items added/removed after claims

## 🔍 Debugging Tips

### Common Issues
1. **Element not found**: Check test IDs and timing
2. **Race conditions**: Add proper waits and synchronization
3. **State corruption**: Use fresh browser contexts
4. **Network timeouts**: Increase timeout values
5. **Concurrent operations**: Use proper locking mechanisms

### Debug Commands
```bash
# Run with debug mode
npx playwright test --debug item-management-basic.spec.ts

# Run with headed browser
npx playwright test --headed item-management-multi-user.spec.ts

# Run specific test
npx playwright test -g "should handle participant dropout" item-management-dropout.spec.ts

# Generate trace
npx playwright test --trace on item-management-edge-cases.spec.ts
```

## 📈 Performance Considerations

### Test Optimization
- Use parallel execution where possible
- Minimize page loads and navigation
- Cache frequently used elements
- Use efficient selectors
- Batch operations when possible

### Resource Management
- Close browser contexts after tests
- Clean up test data
- Use appropriate timeouts
- Monitor memory usage
- Handle network failures gracefully

---

*This comprehensive test suite ensures robust item management functionality across all potluck event scenarios, from basic operations to complex multi-user interactions and edge cases.*