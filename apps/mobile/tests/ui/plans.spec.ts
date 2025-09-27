import { test, expect } from '@playwright/test';
import { loginAsHost } from './event-test-utilities';

test.describe('Plans and Billing Flow', () => {
  test.beforeEach(async ({ page }) => {
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    
    // Login first using proven utilities
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 10000 });
    
    await loginAsHost(page);
    
    // Navigate to plans
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('plans-button').click();
    
    // Wait for plans screen
    await expect(page.getByText('Plans').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display plans screen with billing cycle toggle', async ({ page }) => {
    // Check plans header
    await expect(page.getByText('Plans').first()).toBeVisible();
    
    // Check billing cycle toggle
    await expect(page.getByText('Monthly')).toBeVisible();
    await expect(page.getByText('Yearly')).toBeVisible();
    
    // Check promo code section
    await expect(page.getByText('Promo Code')).toBeVisible();
    await expect(page.getByPlaceholder('Enter code')).toBeVisible();
    await expect(page.getByText('Apply')).toBeVisible();
    
    // Check FAQ section
    await expect(page.getByText('Frequently Asked Questions')).toBeVisible();
    
    // Check fine print
    await expect(page.getByText(/By subscribing, you agree to our Terms/)).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/plans-main.png' });
  });

  test('should toggle between monthly and yearly billing', async ({ page }) => {
    // Initially should be on monthly
    const monthlyOption = page.getByText('Monthly');
    const yearlyOption = page.getByText('Yearly');
    
    // Switch to yearly
    await yearlyOption.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of yearly view
    await page.screenshot({ path: 'test-results/plans-yearly.png' });
    
    // Switch back to monthly
    await monthlyOption.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of monthly view
    await page.screenshot({ path: 'test-results/plans-monthly.png' });
  });

  test('should display plan cards when available', async ({ page }) => {
    // Wait for plans to load
    await page.waitForTimeout(3000);
    
    // Look for plan cards or loading/error states
    const planCards = page.locator('[data-testid*="plan-"], .plan-card, [class*="plan"]');
    const loadingText = page.getByText(/loading plans/i);
    const noPlansText = page.getByText(/no plans available/i);
    
    if (await planCards.count() > 0) {
      // Plans are available
      await expect(planCards.first()).toBeVisible();
      
      // Check for plan features like price, name, etc.
      const planTexts = page.getByText(/free|pro|premium|basic|starter/i);
      if (await planTexts.count() > 0) {
        await expect(planTexts.first()).toBeVisible();
      }
      
      // Look for pricing
      const priceTexts = page.locator('text=/\\$\\d+|Free|\\d+\\/month/');
      if (await priceTexts.count() > 0) {
        await expect(priceTexts.first()).toBeVisible();
      }
      
    } else if (await loadingText.isVisible()) {
      await expect(loadingText).toBeVisible();
    } else if (await noPlansText.isVisible()) {
      await expect(noPlansText).toBeVisible();
    }
    
    // Take screenshot regardless
    await page.screenshot({ path: 'test-results/plans-cards.png' });
  });

  test('should handle plan selection', async ({ page }) => {
    // Wait for plans to load
    await page.waitForTimeout(3000);
    
    // Look for plan selection buttons
    const selectButtons = page.getByRole('button').filter({ hasText: /select|choose|get started|upgrade/i });
    
    if (await selectButtons.count() > 0) {
      const firstSelectButton = selectButtons.first();
      
      // Click the first plan
      await firstSelectButton.click();
      
      // This might open a payment modal or navigate to checkout
      await page.waitForTimeout(2000);
      
      // Take screenshot of what happens after selection
      await page.screenshot({ path: 'test-results/plans-selection.png' });
      
      // Look for payment-related content or modals
      const paymentIndicators = page.locator('text=/payment|checkout|billing|lemonsqueezy/i');
      if (await paymentIndicators.count() > 0) {
        await expect(paymentIndicators.first()).toBeVisible();
      }
    }
  });

  test('should test promo code functionality', async ({ page }) => {
    const promoInput = page.getByPlaceholder('Enter code');
    const applyButton = page.getByText('Apply');
    
    // Enter a test promo code
    await promoInput.fill('TEST123');
    await applyButton.click();
    
    // Should show alert about promo codes
    await expect(page.getByText(/promo code validation will be available soon/i)).toBeVisible({ timeout: 5000 });
    
    // Close alert
    const okButton = page.getByRole('button', { name: /OK/i });
    if (await okButton.isVisible()) {
      await okButton.click();
    }
  });

  test('should expand FAQ items', async ({ page }) => {
    // Find FAQ questions
    const faqQuestions = page.getByText(/can i change my plan|what happens during|how do i cancel|are there any setup fees/i);
    
    if (await faqQuestions.count() > 0) {
      // Click the first FAQ question
      const firstFaq = faqQuestions.first();
      await firstFaq.click();
      
      // Should expand and show answer
      await page.waitForTimeout(500);
      
      // Take screenshot of expanded FAQ
      await page.screenshot({ path: 'test-results/plans-faq-expanded.png' });
      
      // Click again to collapse
      await firstFaq.click();
      await page.waitForTimeout(500);
    }
  });

  test('should handle current subscription display', async ({ page }) => {
    // Wait for subscription data to load
    await page.waitForTimeout(3000);
    
    // Look for current subscription indicators
    const currentPlanIndicators = page.getByText(/current plan|active|subscribed|your plan/i);
    const noSubscriptionText = page.getByText(/no subscription|get started/i);
    
    if (await currentPlanIndicators.count() > 0) {
      // User has an active subscription
      await expect(currentPlanIndicators.first()).toBeVisible();
      
      // Look for cancel/manage options
      const manageButtons = page.getByText(/cancel|manage|update payment/i);
      if (await manageButtons.count() > 0) {
        await expect(manageButtons.first()).toBeVisible();
      }
      
    } else if (await noSubscriptionText.count() > 0) {
      // User has no subscription
      await expect(noSubscriptionText.first()).toBeVisible();
    }
    
    // Take screenshot of subscription status
    await page.screenshot({ path: 'test-results/plans-subscription-status.png' });
  });

  test('should handle plan cancellation flow', async ({ page }) => {
    // Wait for plans to load
    await page.waitForTimeout(3000);
    
    // Look for cancel button (only visible if user has active plan)
    const cancelButton = page.getByText(/cancel/i).filter({ hasText: /cancel/i }).first();
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Should show confirmation dialog
      await expect(page.getByText(/cancel subscription/i)).toBeVisible({ timeout: 5000 });
      
      // Cancel the cancellation (don't actually cancel)
      const keepPlanButton = page.getByRole('button', { name: /keep plan|cancel/i }).first();
      if (await keepPlanButton.isVisible()) {
        await keepPlanButton.click();
      }
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/plans-cancel-dialog.png' });
    }
  });

  test('should navigate back from plans', async ({ page }) => {
    // Look for back button
    const backButton = page.locator('[data-testid*="back"], button').filter({ hasText: /back|arrow/i }).first()
      .or(page.locator('button').first());
    
    if (await backButton.isVisible()) {
      await backButton.click();
      
      // Should return to events list
      await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle plans screen on different viewports', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'test-results/plans-mobile.png' });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'test-results/plans-tablet.png' });
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'test-results/plans-desktop.png' });
  });

  test('should handle loading and error states', async ({ page }) => {
    // Refresh to see loading state
    await page.reload();
    
    // Look for loading indicators
    const loadingIndicators = page.getByText(/loading/i);
    if (await loadingIndicators.count() > 0) {
      await expect(loadingIndicators.first()).toBeVisible();
      
      // Wait for loading to complete
      await page.waitForTimeout(5000);
    }
    
    // Take screenshot of final state
    await page.screenshot({ path: 'test-results/plans-loaded.png' });
  });
});
