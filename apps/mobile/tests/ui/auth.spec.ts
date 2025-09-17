import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for loading to complete
    await page.waitForFunction(() => {
      const hasLoading = !!document.querySelector('[data-testid="loading-container"]');
      return !hasLoading;
    }, { timeout: 10000 });
  });

  test('should display welcome screen with auth form', async ({ page }) => {
    // Check welcome elements
    await expect(page.getByTestId('welcome-title')).toBeVisible();
    await expect(page.getByTestId('welcome-title')).toContainText('Welcome to Potluck');
    await expect(page.getByTestId('welcome-subtitle')).toContainText('Sign in to manage your events');
    
    // Check auth form is present
    await expect(page.getByTestId('auth-form-container')).toBeVisible();
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('sign-in-button')).toBeVisible();
  });

  test('should validate email input', async ({ page }) => {
    const emailInput = page.getByTestId('email-input');
    
    // Enter invalid email
    await emailInput.fill('invalid-email');
    await emailInput.blur();
    
    // Should show error message
    await expect(page.getByTestId('email-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toContainText('Please enter a valid email');
  });

  test('should validate password input', async ({ page }) => {
    const passwordInput = page.getByTestId('password-input');
    
    // Enter short password
    await passwordInput.fill('123');
    await passwordInput.blur();
    
    // Should show error message
    await expect(page.getByTestId('password-error')).toBeVisible();
    await expect(page.getByTestId('password-error')).toContainText('Password must be at least 6 characters');
  });

  test('should toggle between sign in and sign up modes', async ({ page }) => {
    // Initially should be in sign in mode
    await expect(page.getByTestId('sign-in-button')).toBeVisible();
    await expect(page.getByTestId('toggle-auth-text')).toContainText("Don't have an account? Sign Up");
    
    // Toggle to sign up
    await page.getByTestId('toggle-auth-mode').click();
    
    // Should show sign up elements
    await expect(page.getByTestId('sign-up-button')).toBeVisible();
    await expect(page.getByTestId('confirm-password-input')).toBeVisible();
    await expect(page.getByTestId('toggle-auth-text')).toContainText('Already have an account? Sign In');
    
    // Toggle back to sign in
    await page.getByTestId('toggle-auth-mode').click();
    
    // Should hide confirm password
    await expect(page.getByTestId('confirm-password-input')).not.toBeVisible();
    await expect(page.getByTestId('sign-in-button')).toBeVisible();
  });

  test('should show forgot password option in sign in mode', async ({ page }) => {
    // Should show forgot password link
    await expect(page.getByTestId('forgot-password-button')).toBeVisible();
    
    // Toggle to sign up mode
    await page.getByTestId('toggle-auth-mode').click();
    
    // Should hide forgot password link
    await expect(page.getByTestId('forgot-password-button')).not.toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByTestId('password-input');
    const toggleButton = page.getByTestId('password-toggle');
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle
    await toggleButton.click();
    
    // Password should be visible (type changes to text)
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click toggle again
    await toggleButton.click();
    
    // Password should be hidden again
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should validate confirm password in sign up mode', async ({ page }) => {
    // Switch to sign up mode
    await page.getByTestId('toggle-auth-mode').click();
    
    const passwordInput = page.getByTestId('password-input');
    const confirmPasswordInput = page.getByTestId('confirm-password-input');
    
    // Enter different passwords
    await passwordInput.fill('password123');
    await confirmPasswordInput.fill('different');
    await confirmPasswordInput.blur();
    
    // Should show error message
    await expect(page.getByTestId('confirm-password-error')).toBeVisible();
    await expect(page.getByTestId('confirm-password-error')).toContainText('Passwords do not match');
  });

  test('should disable submit button when form is invalid', async ({ page }) => {
    const signInButton = page.getByTestId('sign-in-button');
    
    // Button should be disabled initially
    await expect(signInButton).toBeDisabled();
    
    // Fill valid email
    await page.getByTestId('email-input').fill('test@example.com');
    
    // Button should still be disabled (no password)
    await expect(signInButton).toBeDisabled();
    
    // Fill valid password
    await page.getByTestId('password-input').fill('password123');
    
    // Button should now be enabled
    await expect(signInButton).toBeEnabled();
  });

  test('should show loading state when submitting', async ({ page }) => {
    // Fill valid credentials
    await page.getByTestId('email-input').fill('test@example.com');
    await page.getByTestId('password-input').fill('password123');
    
    // Click sign in button
    await page.getByTestId('sign-in-button').click();
    
    // Should show loading indicator
    await expect(page.getByTestId('auth-loading')).toBeVisible({ timeout: 1000 });
  });
});
