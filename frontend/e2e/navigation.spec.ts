import { test, expect } from '@playwright/test';

test.describe('Navigation & 404 — التنقل', () => {
  test('should show 404 page for unknown routes', async ({ page }) => {
    await page.goto('/some-random-page-that-does-not-exist');
    await expect(page.locator('body')).toContainText('404');
  });

  test('should navigate to admin login page', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('#admin-username')).toBeVisible();
  });

  test('should load kiosk page with code input', async ({ page }) => {
    await page.goto('/kiosk');
    await expect(page.locator('#kiosk-code-input')).toBeVisible();
    await expect(page.locator('h1')).toContainText('كود');
  });

  test('should navigate from kiosk to device details', async ({ page }) => {
    await page.goto('/kiosk');
    await page.fill('#kiosk-code-input', 'HW-2024-001');
    await page.click('#kiosk-submit');
    // Should navigate to device details page
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/device/HW-2024-001');
  });
});

test.describe('Responsive Design — التصميم المتجاوب', () => {
  test('should be mobile-friendly (viewport 375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const phoneInput = page.locator('#phone-input');
    await expect(phoneInput).toBeVisible();

    const button = page.locator('#submit-btn');
    await expect(button).toBeVisible();

    const box = await button.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(200);
  });

  test('should handle tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('#phone-input')).toBeVisible();
  });

  test('admin sidebar should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/login');
    // Login form should still be usable on mobile
    await expect(page.locator('#admin-username')).toBeVisible();
    await expect(page.locator('#admin-login-btn')).toBeVisible();
  });
});

test.describe('SEO & Meta — تحسين محركات البحث', () => {
  test('should have proper meta description', async ({ page }) => {
    await page.goto('/');
    const metaDescription = await page.getAttribute('meta[name="description"]', 'content');
    expect(metaDescription).toBeTruthy();
    expect(metaDescription!.length).toBeGreaterThan(20);
  });

  test('should have theme-color meta tag', async ({ page }) => {
    await page.goto('/');
    const themeColor = await page.getAttribute('meta[name="theme-color"]', 'content');
    expect(themeColor).toBe('#0A0F1E');
  });

  test('should have single h1 on home page', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    const count = await h1.count();
    expect(count).toBe(1);
  });

  test('should have single h1 on kiosk page', async ({ page }) => {
    await page.goto('/kiosk');
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    const count = await h1.count();
    expect(count).toBe(1);
  });
});
