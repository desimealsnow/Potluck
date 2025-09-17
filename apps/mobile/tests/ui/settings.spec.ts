import { test, expect } from '@playwright/test';

test.describe('Settings Flow', () => {
  test.beforeEach(async ({ page }) => {
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    
    // Login first
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 10000 });
    
    await page.getByTestId('email-input').fill('host@test.dev');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('sign-in-button').click();
    
    // Navigate to settings
    await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('settings-button').click();
    
    // Wait for settings screen
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 10000 });
  });

  test('should display settings screen with all options', async ({ page }) => {
    // Check settings header
    await expect(page.getByText('Settings')).toBeVisible();
    
    // Check profile section
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('john.doe@example.com')).toBeVisible();
    
    // Check settings options
    await expect(page.getByText('Subscription')).toBeVisible();
    await expect(page.getByText('Manage your plan')).toBeVisible();
    
    await expect(page.getByText('Notifications')).toBeVisible();
    await expect(page.getByText('Email and push notifications')).toBeVisible();
    
    await expect(page.getByText('Privacy & Security')).toBeVisible();
    await expect(page.getByText('Data and privacy settings')).toBeVisible();
    
    await expect(page.getByText('Help & Support')).toBeVisible();
    await expect(page.getByText('Get help and contact support')).toBeVisible();
    
    await expect(page.getByText('About')).toBeVisible();
    await expect(page.getByText('App version and info')).toBeVisible();
    
    await expect(page.getByText('Sign Out')).toBeVisible();
    await expect(page.getByText('Sign out of your account')).toBeVisible();
    
    // Check footer
    await expect(page.getByText('Potluck App v1.0.0')).toBeVisible();
    await expect(page.getByText('© 2024 Potluck. All rights reserved.')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/settings-main.png' });
  });

  test('should navigate to subscription settings', async ({ page }) => {
    await page.getByText('Subscription').click();
    
    // Should navigate to subscription screen
    await expect(page.getByText('My Potluck Subscription')).toBeVisible({ timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/settings-subscription.png' });
  });

  test('should show notifications alert', async ({ page }) => {
    await page.getByText('Notifications').click();
    
    // Should show alert dialog
    await expect(page.getByText('Notification settings coming soon!')).toBeVisible({ timeout: 5000 });
    
    // Close alert
    const okButton = page.getByRole('button', { name: /OK/i });
    if (await okButton.isVisible()) {
      await okButton.click();
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/settings-notifications.png' });
  });

  test('should show privacy alert', async ({ page }) => {
    await page.getByText('Privacy & Security').click();
    
    // Should show alert dialog
    await expect(page.getByText('Privacy settings coming soon!')).toBeVisible({ timeout: 5000 });
    
    // Close alert
    const okButton = page.getByRole('button', { name: /OK/i });
    if (await okButton.isVisible()) {
      await okButton.click();
    }
  });

  test('should show help alert', async ({ page }) => {
    await page.getByText('Help & Support').click();
    
    // Should show alert dialog
    await expect(page.getByText('Help center coming soon!')).toBeVisible({ timeout: 5000 });
    
    // Close alert
    const okButton = page.getByRole('button', { name: /OK/i });
    if (await okButton.isVisible()) {
      await okButton.click();
    }
  });

  test('should show about information', async ({ page }) => {
    await page.getByText('About').click();
    
    // Should show alert with app info
    await expect(page.getByText('Potluck App v1.0.0')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Built with React Native & Expo')).toBeVisible();
    
    // Close alert
    const okButton = page.getByRole('button', { name: /OK/i });
    if (await okButton.isVisible()) {
      await okButton.click();
    }
  });

  test('should show sign out confirmation', async ({ page }) => {
    await page.getByText('Sign Out').click();
    
    // Should show confirmation dialog
    await expect(page.getByText('Are you sure you want to sign out?')).toBeVisible({ timeout: 5000 });
    
    // Cancel sign out
    const cancelButton = page.getByRole('button', { name: /Cancel/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
    
    // Should remain on settings screen
    await expect(page.getByText('Settings')).toBeVisible();
  });

  test('should complete sign out flow', async ({ page }) => {
    await page.getByText('Sign Out').click();
    
    // Should show confirmation dialog
    await expect(page.getByText('Are you sure you want to sign out?')).toBeVisible({ timeout: 5000 });
    
    // Confirm sign out
    const signOutButton = page.getByRole('button', { name: /Sign Out/i });
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      
      // Should show success alert
      await expect(page.getByText('You have been signed out successfully.')).toBeVisible({ timeout: 5000 });
      
      // Close success alert
      const okButton = page.getByRole('button', { name: /OK/i });
      if (await okButton.isVisible()) {
        await okButton.click();
      }
    }
  });

  test('should navigate back from settings', async ({ page }) => {
    // Look for back button (might be an icon button)
    const backButton = page.getByRole('button').filter({ hasText: /back|arrow/i }).first()
      .or(page.locator('[data-testid*="back"]').first())
      .or(page.locator('button').first()); // Fallback to first button which might be back
    
    if (await backButton.isVisible()) {
      await backButton.click();
      
      // Should return to events list
      await expect(page.getByTestId('events-header')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle settings screen responsiveness', async ({ page }) => {
    // Test different viewport sizes
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.screenshot({ path: 'test-results/settings-mobile.png' });
    
    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
    await page.screenshot({ path: 'test-results/settings-tablet.png' });
    
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await page.screenshot({ path: 'test-results/settings-desktop.png' });
  });
});
