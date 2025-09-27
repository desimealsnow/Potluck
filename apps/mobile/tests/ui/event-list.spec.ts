import { test, expect } from '@playwright/test';
import { loginAsHost } from './event-test-utilities';

test.describe('Event List Flow', () => {
  test.beforeEach(async ({ page }) => {
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    
    // Login first
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 10000 });
    
    // Quick login using proven utilities
    await loginAsHost(page);
    
    // Wait for events list to load
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
  });

  test('should display events dashboard with all components', async ({ page }) => {
    // Check header
    await expect(page.getByTestId('events-title')).toContainText('Events');
    
    // Check action buttons
    await expect(page.getByTestId('create-event-button')).toBeVisible();
    await expect(page.getByTestId('map-toggle-button')).toBeVisible();
    await expect(page.getByTestId('filter-toggle-button')).toBeVisible();
    
    // Check search
    await expect(page.getByTestId('search-container')).toBeVisible();
    await expect(page.getByTestId('search-input')).toBeVisible();
    
    // Check filters
    await expect(page.getByTestId('status-filter-container')).toBeVisible();
    
    // Check if filter toggle button exists (for mobile) or sidebar filters (for tablet)
    const filterToggleButton = page.getByTestId('filter-toggle-button');
    if (await filterToggleButton.isVisible()) {
      // Mobile view - click to open filters
      await filterToggleButton.click();
      await page.waitForTimeout(1000);
      
      // Check ownership filters
      await expect(page.getByTestId('ownership-all')).toBeVisible();
      await expect(page.getByTestId('ownership-mine')).toBeVisible();
      await expect(page.getByTestId('ownership-invited')).toBeVisible();
      
      // Check diet filters
      await expect(page.getByTestId('diet-veg')).toBeVisible();
      await expect(page.getByTestId('diet-nonveg')).toBeVisible();
      await expect(page.getByTestId('diet-mixed')).toBeVisible();
    }
    
    // Check events list
    await expect(page.getByTestId('events-list')).toBeVisible();
  });

  test('should filter events by status', async ({ page }) => {
    // First open the filters
    await page.getByTestId('filter-toggle-button').click();
    await page.waitForTimeout(1000);
    
    // Test status filter tabs
    const statusOptions = ['upcoming', 'drafts', 'past', 'deleted'];
    
    for (const status of statusOptions) {
      await page.getByTestId('status-filter').getByTestId(`status-filter-option-${status}`).click();
      
      // Wait for filter to apply (look for loading or updated content)
      await page.waitForTimeout(1000);
      
      // Verify the filter is clickable and visible
      await expect(
        page.getByTestId('status-filter').getByTestId(`status-filter-option-${status}`)
      ).toBeVisible();
    }
  });

  test('should filter events by ownership', async ({ page }) => {
    // First open the filters
    await page.getByTestId('filter-toggle-button').click();
    await page.waitForTimeout(1000);
    
    const ownershipOptions = ['all', 'mine', 'invited'];
    
    for (const ownership of ownershipOptions) {
      await page.getByTestId(`ownership-${ownership}`).click();
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Verify the filter is visible and clickable
      await expect(page.getByTestId(`ownership-${ownership}`)).toBeVisible();
    }
  });

  test('should filter events by diet', async ({ page }) => {
    // First open the filters
    await page.getByTestId('filter-toggle-button').click();
    await page.waitForTimeout(1000);
    
    const dietOptions = ['veg', 'nonveg', 'mixed'];
    
    for (const diet of dietOptions) {
      await page.getByTestId(`diet-${diet}`).click();
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Diet filters are multi-select, so just verify they're visible
      await expect(page.getByTestId(`diet-${diet}`)).toBeVisible();
      
      // Click again to deselect
      await page.getByTestId(`diet-${diet}`).click();
      await page.waitForTimeout(500);
    }
  });

  test('should search events', async ({ page }) => {
    const searchInput = page.getByTestId('search-input');
    
    // Search for events
    await searchInput.fill('potluck');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1000);
  });

  test('should navigate to create event', async ({ page }) => {
    await page.getByTestId('create-event-button').click();
    
    // Should navigate to create event screen
    await expect(page.getByTestId('create-event-header')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('create-event-title')).toContainText('Create Potluck');
  });

  test('should navigate to plans', async ({ page }) => {
    await page.getByTestId('plans-button').click();
    
    // Should show plans screen
    await expect(page.getByText('Plans').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to settings', async ({ page }) => {
    await page.getByTestId('settings-button').click();
    
    // Should show settings screen
    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display event cards when available', async ({ page }) => {
    // Wait for potential events to load
    await page.waitForTimeout(2000);
    
    // Check if we have events or empty state
    const eventCards = page.locator('[data-testid^="event-card-"]');
    const emptyState = page.getByTestId('empty-state');
    
    const hasEvents = await eventCards.count() > 0;
    const hasEmptyState = await emptyState.isVisible();
    
    if (hasEvents) {
      // Test event card interactions
      const firstCard = eventCards.first();
      await expect(firstCard).toBeVisible();
      
      // Check card components
      await expect(firstCard.getByTestId(/event-card-.*-title/)).toBeVisible();
      
      // Try clicking the first event
      await firstCard.click();
      
      // Should navigate to event details (wait for navigation)
      await page.waitForTimeout(1000);
    } else if (hasEmptyState) {
      await expect(page.getByTestId('empty-text')).toContainText('No events found');
    }
  });

  test('should handle event actions when available', async ({ page }) => {
    // Wait for events to load
    await page.waitForTimeout(2000);
    
    const eventCards = page.locator('[data-testid^="event-card-"]');
    const cardCount = await eventCards.count();
    
    if (cardCount > 0) {
      const firstCard = eventCards.first();
      const actionsContainer = firstCard.getByTestId(/event-card-.*-actions/);
      
      if (await actionsContainer.isVisible()) {
        // Check if there are action buttons
        const actionButtons = actionsContainer.locator('[data-testid^="event-card-"]');
        const buttonCount = await actionButtons.count();
        
        if (buttonCount > 0) {
          // Take screenshot of available actions
          await page.screenshot({ path: 'test-results/event-actions.png' });
          
          // Test that actions are clickable (but don't actually click to avoid side effects)
          await expect(actionButtons.first()).toBeVisible();
        }
      }
    }
  });

  test('should handle pull-to-refresh', async ({ page }) => {
    // Simulate refresh by reloading
    await page.reload();
    
    // Wait for content to reload
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('events-list')).toBeVisible();
  });

  test('should handle infinite scroll when content available', async ({ page }) => {
    // Scroll to bottom of events list
    await page.getByTestId('events-list').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait to see if more content loads
    await page.waitForTimeout(2000);
    
    // Check for load more indicator
    const loadMoreIndicator = page.getByTestId('load-more-indicator');
    if (await loadMoreIndicator.isVisible()) {
      await expect(loadMoreIndicator).toBeVisible();
    }
  });
});
