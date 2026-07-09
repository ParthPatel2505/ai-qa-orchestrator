const { test, expect } = require('@playwright/test');

test('UI @UI', async ({ page }) => {
  await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
  
  // UI-01: Verify password masking
  const passwordField = page.locator('input[name="password"]');
  await expect(passwordField).toHaveAttribute('type', 'password');

  // UI-02: Successful Login
  await page.fill('input[name="username"]', 'Admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);

  // UI-03: Field Validation
  await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
  await page.click('button[type="submit"]');
  const errorMessages = page.locator('.oxd-input-field-error-message');
  await expect(errorMessages.first()).toBeVisible();
});

test('Security @VAPT', async ({ page }) => {
  await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');

  // SEC-01 & SEC-02: SQL Injection Simulation
  await page.fill('input[name="username"]', "' OR 1=1 --");
  await page.fill('input[name="password"]', "' OR 1=1 --");
  await page.click('button[type="submit"]');
  
  const alert = page.locator('.oxd-alert-content-text');
  await expect(alert).toHaveText(/Invalid credentials/);
});

test('Performance @Performance', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
  await page.fill('input[name="username"]', 'Admin');
  await page.fill('input[name="password"]', 'admin123');
  
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type="submit"]')
  ]);
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // PERF-01: Response Time Check
  console.log(`Login duration: ${duration}s`);
  expect(duration).toBeLessThan(5); // Threshold set to 5s for demo environment
});