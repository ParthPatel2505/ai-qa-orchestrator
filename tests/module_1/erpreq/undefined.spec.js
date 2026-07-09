const { test, expect } = require('@playwright/test');

test.describe('User Authentication Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Valid Login and Logout', async ({ page }) => {
    await page.getByLabel(/username|email/i).fill('testuser');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
    
    await page.getByRole('button', { name: /logout|sign out/i }).click();
    await expect(page).toHaveURL(/.*login/);
  });

  test('Session Persistence on Refresh', async ({ page }) => {
    await page.getByLabel(/username|email/i).fill('testuser');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    await page.reload();
    await expect(page.getByRole('button', { name: /logout|sign out/i })).toBeVisible();
  });

  test('Invalid Credentials Error Handling', async ({ page }) => {
    await page.getByLabel(/username|email/i).fill('nonexistent_user');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    const errorMsg = page.locator('.error-message, [role="alert"]');
    await expect(errorMsg).toContainText(/invalid/i);
  });

  test('Empty Fields Validation', async ({ page }) => {
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('Security: SQL Injection and XSS Attempt', async ({ page }) => {
    const maliciousPayload = "' OR '1'='1";
    const xssPayload = "<script>alert('xss')</script>";
    
    await page.getByLabel(/username|email/i).fill(maliciousPayload);
    await page.getByLabel(/password/i).fill(xssPayload);
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    await expect(page).not.toHaveURL(/.*dashboard/);
  });

  test('Password Masking', async ({ page }) => {
    const passwordField = page.getByLabel(/password/i);
    await passwordField.fill('secret123');
    await expect(passwordField).toHaveAttribute('type', 'password');
  });

  test('Enter Key Triggers Login', async ({ page }) => {
    await page.getByLabel(/username|email/i).fill('testuser');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.keyboard.press('Enter');
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Tab Order Navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/username|email/i)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/password/i)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeFocused();
  });

  test('Browser Back Button Security', async ({ page }) => {
    await page.getByLabel(/username|email/i).fill('testuser');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    await page.getByRole('button', { name: /logout|sign out/i }).click();
    await page.goBack();
    
    await expect(page).not.toHaveURL(/.*dashboard/);
  });
});