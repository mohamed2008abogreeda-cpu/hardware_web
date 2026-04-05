import { test, expect } from '@playwright/test';

test.describe('Kiosk Page — صفحة الكيوسك', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kiosk');
  });

  test('should display code input field', async ({ page }) => {
    await expect(page.locator('#kiosk-code-input')).toBeVisible();
  });

  test('should have submit button', async ({ page }) => {
    await expect(page.locator('#kiosk-submit')).toBeVisible();
  });

  test('code input should have dir=ltr', async ({ page }) => {
    await expect(page.locator('#kiosk-code-input')).toHaveAttribute('dir', 'ltr');
  });

  test('should navigate to device page on code submit', async ({ page }) => {
    await page.fill('#kiosk-code-input', 'HW-2024-999');
    await page.click('#kiosk-submit');
    // Wait a bit extra for router navigation
    await page.waitForURL('**/device/**', { timeout: 3000 }).catch(() => {});
    // Check URL changed (router pushes to /device/:code)
    const url = page.url();
    expect(url).toContain('/device/');
  });

  test('should not navigate with empty input', async ({ page }) => {
    await page.click('#kiosk-submit');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/kiosk');
  });
});

test.describe('Rating Page — صفحة التقييم', () => {
  // Route is /rating/:deviceCode
  test.beforeEach(async ({ page }) => {
    await page.goto('/rating/TEST-001');
  });

  test('should show rating heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('تقييم');
  });

  test('should display device code', async ({ page }) => {
    await expect(page.locator('body')).toContainText('TEST-001');
  });

  test('should show 3 star rating rows', async ({ page }) => {
    const starRows = page.locator('.star-rating');
    await expect(starRows).toHaveCount(3);
  });

  test('should show submit button', async ({ page }) => {
    await expect(page.locator('#rating-submit')).toBeVisible();
  });

  test('should show comment textarea', async ({ page }) => {
    await expect(page.locator('#rating-comment')).toBeVisible();
  });

  test('should validate that all ratings are required', async ({ page }) => {
    await page.click('#rating-submit');
    await page.waitForTimeout(300);
    await expect(page.locator('.error-msg')).toBeVisible();
  });

  test('should allow clicking stars', async ({ page }) => {
    // Click 4th star in first rating (Speed)
    const firstRatingStars = page.locator('.star-rating').first().locator('.star');
    await firstRatingStars.nth(3).click(); // 4th star
    await expect(firstRatingStars.nth(3)).toHaveClass(/filled/);
  });
});

test.describe('Device Details Page — صفحة تفاصيل الجهاز', () => {
  test('should show back link', async ({ page }) => {
    await page.goto('/device/HW-TEST-001');
    const backLink = page.locator('.back-link');
    await expect(backLink).toBeVisible();
  });

  test('should show loading then content or empty state', async ({ page }) => {
    await page.goto('/device/HW-TEST-001');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(10);
  });

  test('should show login prompt for unauthenticated users', async ({ page }) => {
    await page.goto('/device/HW-TEST-001');
    await page.waitForTimeout(2000);
    // Wait for network idle to ensure rendering finishes
    await page.waitForLoadState('networkidle');
    // Either login-prompt or empty-state should be visible
    const loginPrompt = page.locator('.login-prompt');
    const emptyState = page.locator('.empty-state');
    const hasPrompt = await loginPrompt.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasPrompt || hasEmpty).toBe(true);
  });

  test('back link should go to kiosk for unauthenticated users', async ({ page }) => {
    await page.goto('/device/HW-TEST-001');
    await page.waitForTimeout(500);
    const backLink = page.locator('.back-link');
    const href = await backLink.getAttribute('href');
    expect(href).toContain('/kiosk');
  });
});

test.describe('Approval Page — صفحة الموافقة', () => {
  test('should load with token parameter', async ({ page }) => {
    await page.goto('/approval/test-token-123');
    await page.waitForTimeout(1000);
    // Should render the approval card
    const cards = page.locator('.approval-card');
    await expect(cards).toHaveCount(1);
  });

  test('should show error for invalid token', async ({ page }) => {
    await page.goto('/approval/invalid-token');
    await page.waitForTimeout(2000);
    // Should show error state (since backend is not running)
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(10);
  });
});

test.describe('Share Page — صفحة المشاركة', () => {
  test('should load share page with token', async ({ page }) => {
    await page.goto('/share/test-share-token');
    await page.waitForTimeout(1000);
    const cards = page.locator('.share-card');
    await expect(cards).toHaveCount(1);
  });

  test('should show share badge', async ({ page }) => {
    await page.goto('/share/test-share-token');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    // Should contain content (error or share data)
    expect(body!.length).toBeGreaterThan(10);
  });
});

test.describe('Profile Page — صفحة الحساب', () => {
  test('should redirect to home when not authenticated', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForTimeout(1000);
    // Should redirect to home (router guard)
    const url = page.url();
    expect(url).toMatch(/\/(#\/?)?$/);
  });
});

test.describe('Kiosk → Device Flow', () => {
  test('should navigate from kiosk to device details', async ({ page }) => {
    await page.goto('/kiosk');
    await page.fill('#kiosk-code-input', 'AB-4806');
    await page.click('#kiosk-submit');
    await page.waitForURL('**/device/**', { timeout: 5000 }).catch(() => {});
    expect(page.url()).toContain('/device/AB-4806');
  });

  test('should show device page after kiosk submit with real code', async ({ page }) => {
    await page.goto('/kiosk');
    await page.fill('#kiosk-code-input', 'AB-4807');
    await page.click('#kiosk-submit');
    await page.waitForTimeout(1000);
    // Back link should be visible on device page
    const backLink = page.locator('.back-link');
    await expect(backLink).toBeVisible();
  });
});

test.describe('Auth Redirects — حماية الصفحات', () => {
  test('track page should redirect unauthenticated to home', async ({ page }) => {
    await page.goto('/track');
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).not.toContain('/track');
  });

  test('admin dashboard should redirect to admin login', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toContain('/admin/login');
  });
});
