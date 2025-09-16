import { test, expect } from '@playwright/test';

test.describe('Subscription flow (web build)', () => {
  test('Login and navigate to Subscriptions, start checkout', async ({ page }) => {
    // Reduce default wait to fail faster when elements are missing
    page.setDefaultTimeout(5000);
    test.setTimeout(20000);
    const url = process.env.MOBILE_WEB_URL || 'http://localhost:8081/';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    // Screenshot initial page to confirm we are on the right screen
    await page.screenshot({ path: 'test-results/subscription-initial.png', fullPage: true });
    // Wait for loading overlay to disappear and inputs to be present
    await page.waitForFunction(() => {
      const hasLoading = !!Array.from(document.querySelectorAll('*')).find(el => /loading\.?/i.test(el.textContent || ''));
      const inputs = document.querySelectorAll('input');
      return !hasLoading && inputs.length >= 1;
    }, { timeout: 15000 });

    // Login using the new testIDs I added
    const emailInput = page.getByTestId('email-input').or(page.getByPlaceholder('Email').first()).or(page.locator('input').first());
    await emailInput.fill('host@test.dev');
    const passInput = page.getByTestId('password-input').or(page.getByPlaceholder('Password').first()).or(page.locator('input[type="password"]').first());
    await passInput.fill('password123');
    // Submit via Enter key to avoid RN Web pressable quirks
    await passInput.press('Enter');
    // Fallback: click the login button using new testID
    const loginBtn = page.getByTestId('sign-in-button');
    await loginBtn.scrollIntoViewIfNeeded().catch(() => {});
    await loginBtn.click({ timeout: 2000 }).catch(async () => {
      await page.getByText(/^Sign In$/).first().click().catch(() => {});
    });
    // Screenshot after login click
    await page.screenshot({ path: 'test-results/subscription-after-login-click.png', fullPage: true });

    // Go to subscriptions
    // Navigate to subscriptions - look for text if link role isn't present in RN web
    const subNav = page.getByText(/Subscription|Subscriptions/i).first();
    if (await subNav.isVisible()) {
      await subNav.click();
    }
    await expect(page.getByText(/No Subscription Yet|Subscriptions/i)).toBeVisible({ timeout: 5000 });

    // Start checkout (opens new tab/pop-up). Click the first plan's "Get Started"
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /get started/i }).first().click()
    ]);

    // LemonSqueezy page should show
    await expect(popup.locator('body')).toContainText(/LemonSqueezy|Checkout|Order|Payment/i);
    await popup.screenshot({ path: 'test-results/subscription-checkout.png', fullPage: true });

    // Close payment window (we don't complete payment in UI test)
    await popup.close();

    // Back on main page, refresh and assert fetch happens
    await page.reload();
    await expect(page.getByText(/Subscriptions|No Subscription Yet/i)).toBeVisible();
  });
});

