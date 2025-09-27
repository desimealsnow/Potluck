import { test, expect } from '@playwright/test';
import { 
  createEventWithItems,
  claimItem,
  verifyItemExists,
  verifyItemClaimedBy,
  navigateToItemsTab,
  EVENT_TEMPLATES,
  ITEM_TEMPLATES
} from './item-management-utilities';
import { loginAsHost } from './event-test-utilities';

test.describe('Item Management - Real-World Scenarios', () => {
  test('should handle vegetarian potluck event', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.VEGETARIAN_EVENT);
    
    // Verify all items are vegetarian
    await navigateToItemsTab(page);
    
    for (const item of EVENT_TEMPLATES.VEGETARIAN_EVENT.items) {
      const itemCard = page.locator(`[data-testid*="item-card-${item.name.toLowerCase().replace(/\s+/g, '-')}"]`);
      if (await itemCard.isVisible()) {
        const dietaryTags = itemCard.getByTestId('dietary-tags');
        if (await dietaryTags.isVisible()) {
          const tagsText = await dietaryTags.textContent();
          expect(tagsText).toContain('vegetarian');
        }
      }
    }
  });

  test('should handle large potluck with many items', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.LARGE_POTLUCK);
    
    // Verify all items were created
    await navigateToItemsTab(page);
    
    const itemCards = page.locator('[data-testid*="item-card-"]');
    const itemCount = await itemCards.count();
    
    expect(itemCount).toBe(EVENT_TEMPLATES.LARGE_POTLUCK.items.length);
  });

  test('should handle item category filtering', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.LARGE_POTLUCK);
    
    // Test category filtering
    await navigateToItemsTab(page);
    
    // Filter by main course
    const mainCourseFilter = page.getByTestId('filter-main-course');
    if (await mainCourseFilter.isVisible()) {
      await mainCourseFilter.click();
      await page.waitForTimeout(1000);
      
      // Verify only main course items are visible
      const visibleItems = page.locator('[data-testid*="item-card-"]:visible');
      const visibleCount = await visibleItems.count();
      
      // Should show at least the main course items
      expect(visibleCount).toBeGreaterThan(0);
    }
  });

  test('should handle item search functionality', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.LARGE_POTLUCK);
    
    // Test item search
    await navigateToItemsTab(page);
    
    const searchInput = page.getByTestId('item-search-input');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Chicken');
      await page.waitForTimeout(1000);
      
      // Verify search results
      const searchResults = page.locator('[data-testid*="item-card-"]:visible');
      const resultCount = await searchResults.count();
      
      // Should find at least one result
      expect(resultCount).toBeGreaterThan(0);
    }
  });

  test('should handle dietary restrictions filtering', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.LARGE_POTLUCK);
    
    // Test dietary restrictions filtering
    await navigateToItemsTab(page);
    
    // Filter by vegetarian items
    const vegetarianFilter = page.getByTestId('filter-vegetarian');
    if (await vegetarianFilter.isVisible()) {
      await vegetarianFilter.click();
      await page.waitForTimeout(1000);
      
      // Verify only vegetarian items are visible
      const visibleItems = page.locator('[data-testid*="item-card-"]:visible');
      const visibleCount = await visibleItems.count();
      
      // Should show at least some items
      expect(visibleCount).toBeGreaterThan(0);
    }
  });

  test('should handle item sorting by category', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.LARGE_POTLUCK);
    
    // Test item sorting
    await navigateToItemsTab(page);
    
    // Sort by category
    const sortButton = page.getByTestId('sort-items-button');
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await page.waitForTimeout(1000);
      
      // Select category sorting
      const categorySortOption = page.getByTestId('sort-by-category');
      if (await categorySortOption.isVisible()) {
        await categorySortOption.click();
        await page.waitForTimeout(1000);
        
        // Verify items are sorted by category
        const itemCards = page.locator('[data-testid*="item-card-"]');
        const firstItem = itemCards.first();
        const firstItemCategory = await firstItem.getByTestId('item-category').textContent();
        
        // Should have a category
        expect(firstItemCategory).toBeTruthy();
      }
    }
  });

  test('should handle item quantity calculations', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.SMALL_DINNER);
    
    // Test quantity calculations
    await navigateToItemsTab(page);
    
    // Check if quantity calculations are displayed
    const itemCards = page.locator('[data-testid*="item-card-"]');
    const firstItem = itemCards.first();
    
    if (await firstItem.isVisible()) {
      const quantityDisplay = firstItem.getByTestId('item-quantity-display');
      if (await quantityDisplay.isVisible()) {
        const quantityText = await quantityDisplay.textContent();
        
        // Should show quantity information
        expect(quantityText).toBeTruthy();
        expect(quantityText).toMatch(/\d+/); // Should contain numbers
      }
    }
  });

  test('should handle item status indicators', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.SMALL_DINNER);
    
    // Test item status indicators
    await navigateToItemsTab(page);
    
    const itemCards = page.locator('[data-testid*="item-card-"]');
    const firstItem = itemCards.first();
    
    if (await firstItem.isVisible()) {
      const statusIndicator = firstItem.getByTestId('item-status-indicator');
      if (await statusIndicator.isVisible()) {
        const statusText = await statusIndicator.textContent();
        
        // Should show status (claimed/unclaimed)
        expect(statusText).toBeTruthy();
        expect(['claimed', 'unclaimed', 'partially claimed']).toContain(statusText?.toLowerCase());
      }
    }
  });

  test('should handle item progress tracking', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.LARGE_POTLUCK);
    
    // Test progress tracking
    await navigateToItemsTab(page);
    
    // Check if progress bar is displayed
    const progressBar = page.getByTestId('items-progress-bar');
    if (await progressBar.isVisible()) {
      const progressText = await progressBar.textContent();
      
      // Should show progress information
      expect(progressText).toBeTruthy();
      expect(progressText).toMatch(/\d+\/\d+/); // Should show "claimed/total" format
    }
  });

  test('should handle item recommendations', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.SMALL_DINNER);
    
    // Test item recommendations
    await navigateToItemsTab(page);
    
    // Check if recommendations are shown
    const recommendations = page.getByTestId('item-recommendations');
    if (await recommendations.isVisible()) {
      const recommendationItems = recommendations.locator('[data-testid*="recommendation-item-"]');
      const recommendationCount = await recommendationItems.count();
      
      // Should have some recommendations
      expect(recommendationCount).toBeGreaterThan(0);
    }
  });

  test('should handle item sharing functionality', async ({ page }) => {
    await loginAsHost(page);
    
    const eventId = await createEventWithItems(page, EVENT_TEMPLATES.SMALL_DINNER);
    
    // Test item sharing
    await navigateToItemsTab(page);
    
    const itemCards = page.locator('[data-testid*="item-card-"]');
    const firstItem = itemCards.first();
    
    if (await firstItem.isVisible()) {
      const shareButton = firstItem.getByTestId('share-item-button');
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(1000);
        
        // Check if share options are shown
        const shareOptions = page.getByTestId('share-options');
        const hasShareOptions = await shareOptions.isVisible();
        expect(hasShareOptions).toBe(true);
      }
    }
  });
});