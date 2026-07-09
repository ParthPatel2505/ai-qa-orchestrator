const { test, expect } = require('@playwright/test');

test('UI @UI', async ({ page }) => {
  await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
  await page.fill('input[name="username"]', 'Admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('.oxd-topbar-header-breadcrumb')).toBeVisible();
});

test('Security @VAPT', async ({ page }) => {
  await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
  
  // Test Case: Invalid Credentials
  await page.fill('input[name="username"]', 'InvalidUser');
  await page.fill('input[name="password"]', 'WrongPass');
  await page.click('button[type="submit"]');
  await expect(page.locator('.oxd-alert-content-text')).toBeVisible();
  
  // Test Case: Credential Masking
  const passwordField = page.locator('input[name="password"]');
  await expect(passwordField).toHaveAttribute('type', 'password');
});

test('Performance @Performance', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
  
  await page.fill('input[name="username"]', 'Admin');
  await page.fill('input[name="password"]', 'admin123');
  
  const responsePromise = page.waitForResponse(resp => resp.url().includes('/auth/validate') && resp.status() === 200);
  await page.click('button[type="submit"]');
  await responsePromise;
  
  const duration = Date.now() - startTime;
  console.log(`Login transition took ${duration}ms`);
  
  await expect(page).toHaveURL(/.*dashboard/);
});