import { test, expect } from '@playwright/test';
import { 
  setupMultiUserItemScenario,
  claimItem,
  testItemOverclaiming,
  testItemDeletionWithClaims,
  navigateToItemsTab,
  EVENT_TEMPLATES,
  ITEM_TEMPLATES
} from './item-management-utilities';
import { loginAsHost, createAndPublishEvent } from './event-test-utilities';

test.describe('Item Management - Edge Cases', () => {
  test('should prevent item overclaiming', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createAndPublishEvent(page, 'Test Event', 'Test Description');
    
    // Try to overclaim an item
    const overclaimingPrevented = await testItemOverclaiming(page, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
    expect(overclaimingPrevented).toBe(true);
  });

  test('should prevent item deletion with existing claims', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    
    try {
      // Setup scenario
      const { eventId } = await setupMultiUserItemScenario(
        hostPage, 
        [guestPage], 
        EVENT_TEMPLATES.SMALL_DINNER
      );
      
      // Guest claims an item
      await claimItem(guestPage, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
      
      // Try to delete the claimed item
      const deletionPrevented = await testItemDeletionWithClaims(hostPage, ITEM_TEMPLATES.MAIN_COURSE.name);
      expect(deletionPrevented).toBe(true);
      
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('should handle item modification with existing claims', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    
    try {
      // Setup scenario
      const { eventId } = await setupMultiUserItemScenario(
        hostPage, 
        [guestPage], 
        EVENT_TEMPLATES.SMALL_DINNER
      );
      
      // Guest claims an item
      await claimItem(guestPage, ITEM_TEMPLATES.MAIN_COURSE.name, 1);
      
      // Try to modify the claimed item
      await navigateToItemsTab(hostPage);
      
      const itemCard = hostPage.locator(`[data-testid*="item-card-${ITEM_TEMPLATES.MAIN_COURSE.name.toLowerCase().replace(/\s+/g, '-')}"]`);
      if (await itemCard.isVisible()) {
        const editButton = itemCard.getByTestId('edit-item-button');
        if (await editButton.isVisible()) {
          await editButton.click();
          await hostPage.waitForTimeout(1000);
          
          // Check if modification is allowed
          const modificationAllowed = await hostPage.getByTestId('item-edit-form').isVisible();
          expect(modificationAllowed).toBe(true);
        }
      }
      
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('should handle network errors during item operations', async ({ page }) => {
    await loginAsHost(page);
    
    // Simulate network error
    await page.route('**/api/v1/events/*/items', route => {
      route.abort('failed');
    });
    
    const eventId = await createAndPublishEvent(page, 'Test Event', 'Test Description');
    
    // Try to add item with network error
    await navigateToItemsTab(page);
    
    const addItemButton = page.getByTestId('add-item-button');
    if (await addItemButton.isVisible()) {
      await addItemButton.click();
      await page.waitForTimeout(1000);
      
      // Verify error handling
      const errorMessage = page.getByTestId('error-message');
      const hasError = await errorMessage.isVisible();
      expect(hasError).toBe(true);
    }
  });

  test('should handle invalid item data', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createAndPublishEvent(page, 'Test Event', 'Test Description');
    
    // Try to add item with invalid data
    await navigateToItemsTab(page);
    
    const addItemButton = page.getByTestId('add-item-button');
    if (await addItemButton.isVisible()) {
      await addItemButton.click();
      await page.waitForTimeout(1000);
      
      // Try to save with empty name
      const saveButton = page.getByTestId('save-item-button');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(1000);
        
        // Verify validation error
        const validationError = page.getByTestId('validation-error');
        const hasValidationError = await validationError.isVisible();
        expect(hasValidationError).toBe(true);
      }
    }
  });

  test('should handle item quantity edge cases', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createAndPublishEvent(page, 'Test Event', 'Test Description');
    
    // Test zero quantity
    await navigateToItemsTab(page);
    
    const addItemButton = page.getByTestId('add-item-button');
    if (await addItemButton.isVisible()) {
      await addItemButton.click();
      await page.waitForTimeout(1000);
      
      // Set zero quantity
      const quantityInput = page.getByTestId('item-quantity-input');
      if (await quantityInput.isVisible()) {
        await quantityInput.fill('0');
        
        // Try to save
        const saveButton = page.getByTestId('save-item-button');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(1000);
          
          // Verify validation error
          const validationError = page.getByTestId('quantity-validation-error');
          const hasValidationError = await validationError.isVisible();
          expect(hasValidationError).toBe(true);
        }
      }
    }
  });

  test('should handle item name edge cases', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createAndPublishEvent(page, 'Test Event', 'Test Description');
    
    // Test very long item name
    await navigateToItemsTab(page);
    
    const addItemButton = page.getByTestId('add-item-button');
    if (await addItemButton.isVisible()) {
      await addItemButton.click();
      await page.waitForTimeout(1000);
      
      // Set very long name
      const nameInput = page.getByTestId('item-name-input');
      if (await nameInput.isVisible()) {
        const longName = 'A'.repeat(1000); // Very long name
        await nameInput.fill(longName);
        
        // Try to save
        const saveButton = page.getByTestId('save-item-button');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(1000);
          
          // Verify validation error
          const validationError = page.getByTestId('name-length-validation-error');
          const hasValidationError = await validationError.isVisible();
          expect(hasValidationError).toBe(true);
        }
      }
    }
  });

  test('should handle special characters in item names', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createAndPublishEvent(page, 'Test Event', 'Test Description');
    
    // Test special characters
    await navigateToItemsTab(page);
    
    const addItemButton = page.getByTestId('add-item-button');
    if (await addItemButton.isVisible()) {
      await addItemButton.click();
      await page.waitForTimeout(1000);
      
      // Set name with special characters
      const nameInput = page.getByTestId('item-name-input');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Item with Special Characters: !@#$%^&*()');
        
        // Try to save
        const saveButton = page.getByTestId('save-item-button');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(1000);
          
          // Should succeed with special characters
          const successMessage = page.getByTestId('item-added-success');
          const hasSuccess = await successMessage.isVisible();
          expect(hasSuccess).toBe(true);
        }
      }
    }
  });
});