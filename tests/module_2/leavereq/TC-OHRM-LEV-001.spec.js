const { test, expect } = require('@playwright/test');

test.describe('Leave Module Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/web/index.php/auth/login');
    await page.getByPlaceholder('Username').fill('Admin');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('TC_01 & TC_02: Happy Path Navigation and UI Verification', async ({ page }) => {
    await page.getByRole('link', { name: /leave/i }).click();
    await expect(page).toHaveURL(/leave\/viewLeaveList/);
    
    const header = page.locator('.oxd-topbar-header-breadcrumb');
    await expect(header).toContainText('Leave');
    await expect(header).toContainText('Leave List');
    
    const table = page.locator('.oxd-table');
    await expect(table).toBeVisible();
  });

  test('TC_03: Session Persistence', async ({ page }) => {
    await page.getByRole('link', { name: /leave/i }).click();
    await page.reload();
    await expect(page).toHaveURL(/leave\/viewLeaveList/);
    await expect(page.getByRole('heading', { name: /leave list/i })).toBeVisible();
  });

  test('TC_04: Negative - Unauthorized Access', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/web/index.php/leave/viewLeaveList');
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('TC_05: Performance and Console Integrity', async ({ page }) => {
    const startTime = Date.now();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Console error detected: ${msg.text()}`);
      }
    });

    await page.getByRole('link', { name: /leave/i }).click();
    await page.waitForLoadState('networkidle');
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000);
  });

  test('Lead QA Recommendation: Empty State Handling', async ({ page }) => {
    await page.getByRole('link', { name: /leave/i }).click();
    
    // Simulate filter that returns no results to verify empty state
    await page.getByPlaceholder('Type for hints...').first().fill('NonExistentUser12345');
    await page.getByRole('button', { name: /search/i }).click();
    
    const noRecords = page.locator('.oxd-text--span', { hasText: 'No Records Found' });
    await expect(noRecords).toBeVisible();
  });
});