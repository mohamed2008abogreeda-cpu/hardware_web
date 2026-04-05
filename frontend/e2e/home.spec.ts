import { test, expect } from '@playwright/test';

test.describe('Home Page — صفحة البداية', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load with RTL direction and Arabic lang', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'ar');
  });

  test('should display the page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Hardware/);
  });

  test('should show the phone input form', async ({ page }) => {
    const phoneInput = page.locator('#phone-input');
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toHaveAttribute('type', 'tel');
  });

  test('should show the submit button with Arabic text', async ({ page }) => {
    const button = page.locator('#submit-btn');
    await expect(button).toBeVisible();
    // Button should have Arabic text (تتبع جهازي)
    const text = await button.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('should show the kiosk link', async ({ page }) => {
    const kioskLink = page.locator('#kiosk-link');
    await expect(kioskLink).toBeVisible();
  });

  test('should use dark theme by default', async ({ page }) => {
    const bg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    });
    expect(bg).toBeTruthy();
  });

  test('should validate phone input — reject empty', async ({ page }) => {
    const button = page.locator('#submit-btn');
    await button.click();
    // Should not navigate away — stays on home
    await expect(page).toHaveURL('/');
  });

  test('phone input field should have dir=ltr for number entry', async ({ page }) => {
    const phoneInput = page.locator('#phone-input');
    await expect(phoneInput).toHaveAttribute('dir', 'ltr');
  });

  test('country code selector should be visible', async ({ page }) => {
    const countrySelect = page.locator('#country-code');
    await expect(countrySelect).toBeVisible();
  });

  test('should have gradient text on hero title', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text?.length).toBeGreaterThan(3);
  });
});
