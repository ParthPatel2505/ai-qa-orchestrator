const { test, expect } = require('@playwright/test');

test.describe('OrangeHRM Login Module', () => {
  const URL = 'https://opensource-demo.orangehrmlive.com/';

  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
  });

  test('TC-01: Successful Login', async ({ page }) => {
    await page.getByPlaceholder('Username').fill('Admin');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('TC-02 & TC-03: Invalid Credentials', async ({ page }) => {
    await page.getByPlaceholder('Username').fill('InvalidUser');
    await page.getByPlaceholder('Password').fill('InvalidPass');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('TC-04: Empty Fields Validation', async ({ page }) => {
    await page.getByRole('button', { name: /login/i }).click();
    const requiredMessages = page.locator('.oxd-input-field-error-message');
    await expect(requiredMessages.first()).toHaveText('Required');
    await expect(requiredMessages.nth(1)).toHaveText('Required');
  });

  test('TC-05: Case Sensitivity', async ({ page }) => {
    await page.getByPlaceholder('Username').fill('admin');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('TC-06 & TC-07: Logout and Back Button Security', async ({ page }) => {
    await page.getByPlaceholder('Username').fill('Admin');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await page.locator('.oxd-userdropdown-name').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/login/);
    
    await page.goBack();
    await expect(page).toHaveURL(/login/);
  });

  test('TC-08 & Security: UI/UX and Password Masking', async ({ page }) => {
    const passwordField = page.getByPlaceholder('Password');
    await expect(page.getByAltText('company-branding')).toBeVisible();
    await expect(passwordField).toHaveAttribute('type', 'password');
    
    await passwordField.fill('test');
    await expect(passwordField).toHaveValue('test');
  });

  test('Usability: Enter key triggers login', async ({ page }) => {
    await page.getByPlaceholder('Username').fill('Admin');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/dashboard/);
  });
});