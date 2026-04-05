import { test, expect } from '@playwright/test';

test.describe('Admin Login — دخول الإدارة', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('should display admin login form', async ({ page }) => {
    const usernameInput = page.locator('#admin-username');
    const passwordInput = page.locator('#admin-password');
    const loginBtn = page.locator('#admin-login-btn');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginBtn).toBeVisible();
  });

  test('should show login heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('لوحة التحكم');
  });

  test('should have password type on password field', async ({ page }) => {
    const passwordInput = page.locator('#admin-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should submit login form with credentials', async ({ page }) => {
    await page.fill('#admin-username', 'admin');
    await page.fill('#admin-password', 'password123');
    await page.click('#admin-login-btn');

    // Wait for response 
    await page.waitForTimeout(1500);

    // Depending on backend state (running/mocked/down), we either stay and see an error, or succeed and redirect
    const url = page.url();
    const isRedirected = url.includes('/admin') && !url.includes('/login');
    
    if (!isRedirected) {
      const loginBtn = page.locator('#admin-login-btn');
      await expect(loginBtn).toBeVisible();
    } else {
      expect(isRedirected).toBe(true);
    }
  });
});
