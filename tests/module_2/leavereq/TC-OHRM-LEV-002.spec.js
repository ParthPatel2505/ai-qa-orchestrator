const { test, expect } = require('@playwright/test');

test.describe('Leave Application Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('https://opensource-demo.orangehrmlive.com/');
    await page.getByPlaceholder('Username').fill('Admin');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: /login/i }).click();
    await page.getByRole('link', { name: /leave/i }).click();
    await page.getByRole('link', { name: /apply/i }).click();
  });

  test('TC_01, TC_02, TC_03: Verify mandatory field validation on empty submission', async ({ page }) => {
    const applyButton = page.getByRole('button', { name: /apply/i });
    
    // Trigger validation
    await applyButton.click();

    // Verify error messages appear for mandatory fields
    // Using locator patterns that target the error message containers typically found in such forms
    const errorMessages = page.locator('.oxd-input-field-error-message');
    
    // Assert that multiple error messages are visible (Leave Type, From Date, To Date)
    await expect(errorMessages.first()).toBeVisible();
    const count = await errorMessages.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Verify UI/UX: Check for red text color (CSS property check)
    const firstError = errorMessages.first();
    await expect(firstError).toHaveCSS('color', 'rgb(235, 9, 16)'); // Standard OrangeHRM error red

    // Verify form submission block: Ensure URL has not changed and no success toast appears
    await expect(page).toHaveURL(/.*applyLeave/);
    await expect(page.getByText(/successfully saved/i)).not.toBeVisible();
  });
});