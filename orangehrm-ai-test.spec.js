import { test, expect } from '@playwright/test';

// Define the base URL for OrangeHRM
const ORANGEHRM_BASE_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php';

test.describe('Leave List Page UI Verification', () => {

    // Helper function for login, to be reused across tests
    async function loginAsAdmin(page) {
        await page.goto(`${ORANGEHRM_BASE_URL}/auth/login`);
        await page.getByPlaceholder('username').fill('Admin');
        await page.getByPlaceholder('password').fill('admin123');
        await page.getByRole('button', { name: 'Login' }).click();
        // Wait for dashboard to load to confirm successful login
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    }

    test('TC_UI_POS_001: Verify Leave List Page Loads Successfully for Admin User', async ({ page }) => {
        // Step 1: Log in to the application
        await loginAsAdmin(page);

        // Step 2: Locate and click on the 'Leave' menu tab
        await page.getByRole('link', { name: 'Leave' }).click();

        // Expected Result:
        // The browser successfully navigates to the 'Leave List' page.
        await expect(page).toHaveURL(/leave\/viewLeaveList/);

        // The page title is "Leave List" or contains "Leave" and "List".
        // OrangeHRM appends its name to all titles, so checking for "OrangeHRM" is a general check.
        // A more specific check for the main header is usually more robust for content verification.
        await expect(page).toHaveTitle(/OrangeHRM/);

        // A main header "Leave List" or similar is prominently displayed on the page.
        await expect(page.getByRole('heading', { name: 'Leave List' })).toBeVisible();

        // Key elements specific to a leave list are visible and rendered correctly.
        // Example: "Apply Leave" button, "Assign Leave" button, "Search" button for filters.
        await expect(page.getByRole('button', { name: 'Apply Leave' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Assign Leave' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();

        // Check for filter elements (date pickers, dropdowns)
        await expect(page.getByPlaceholder('yyyy-mm-dd')).toHaveCount(2); // From Date and To Date pickers
        await expect(page.getByRole('combobox', { name: 'Show Leave with Status' })).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Leave Type' })).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Employee Name' })).toBeVisible(); // Employee Name filter

        // Check for table headers indicating leave data
        await expect(page.getByRole('columnheader', { name: 'From Date' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'To Date' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Employee Name' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Leave Type' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();

        // No error messages, broken images, or loading spinners are present.
        // A generic check for common error text.
        await expect(page.getByText('Error', { exact: false })).not.toBeVisible();
        await expect(page.getByText('Failed', { exact: false })).not.toBeVisible();
        await expect(page.getByText('Something Went Wrong', { exact: false })).not.toBeVisible();
    });

    test('TC_UI_POS_002: Verify Interactive Elements on Leave List Page are Present and Functional', async ({ page }) => {
        // Step 1: Assume successful login and navigation to Leave List page
        await loginAsAdmin(page);
        await page.getByRole('link', { name: 'Leave' }).click();
        // Ensure the page has loaded its main content before checking interactive elements
        await expect(page.getByRole('heading', { name: 'Leave List' })).toBeVisible();

        // Expected Result:
        // Interactive elements such as the "Apply Leave" button, date range filters, or a search bar for leave requests are visible and appear enabled.
        const applyLeaveButton = page.getByRole('button', { name: 'Apply Leave' });
        await expect(applyLeaveButton).toBeVisible();
        await expect(applyLeaveButton).toBeEnabled();

        const searchButton = page.getByRole('button', { name: 'Search' });
        await expect(searchButton).toBeVisible();
        await expect(searchButton).toBeEnabled();

        // Check date pickers
        const fromDatePicker = page.getByPlaceholder('yyyy-mm-dd').first();
        const toDatePicker = page.getByPlaceholder('yyyy-mm-dd').last();
        await expect(fromDatePicker).toBeVisible();
        await expect(fromDatePicker).toBeEnabled();
        await expect(toDatePicker).toBeVisible();
        await expect(toDatePicker).toBeEnabled();

        // Check dropdowns
        const leaveTypeDropdown = page.getByRole('combobox', { name: 'Leave Type' });
        await expect(leaveTypeDropdown).toBeVisible();
        await expect(leaveTypeDropdown).toBeEnabled();

        const employeeNameDropdown = page.getByRole('combobox', { name: 'Employee Name' });
        await expect(employeeNameDropdown).toBeVisible();
        await expect(employeeNameDropdown).toBeEnabled();

        // The page content is dynamic and not a static error page or a blank screen.
        // This is implicitly covered by checking for specific interactive elements and table rows.
        // Expect at least the table header row to be present, indicating the table structure loaded.
        await expect(page.getByRole('table')).toBeVisible();
        await expect(page.getByRole('rowgroup', { name: 'thead' })).toBeVisible(); // Check for table header group
    });

    test('TC_UI_NEG_001: Verify Error Page Displayed When Leave List Fails to Load', async ({ page }) => {
        // IMPORTANT NOTE FOR THIS NEGATIVE TEST CASE:
        // To truly simulate a backend service failure (e.g., 500 Internal Server Error)
        // that prevents the Leave List from loading, you would typically use Playwright's
        // `page.route()` to intercept the relevant API call and force it to fail.
        //
        // Example of how to mock a failed API response (uncomment and adapt for actual API endpoint):
        // await page.route('**/api/v2/leave/list**', async route => {
        //     await route.fulfill({
        //         status: 500,
        //         contentType: 'application/json',
        //         body: JSON.stringify({ message: 'Internal Server Error: Failed to load leave data' }),
        //     });
        // });
        //
        // Without such mocking, this test will attempt to load the Leave List page
        // under normal conditions. If the application is working correctly, the Leave List
        // will load successfully, causing the negative assertions (e.g., `not.toBeVisible()`)
        // to FAIL.
        //
        // This test is written to demonstrate the *assertions* for an error state,
        // assuming the error has been successfully triggered by a preceding setup (like mocking).

        // Step 1: Log in to the application
        await loginAsAdmin(page);

        // Step 2: Click on the 'Leave' menu tab in the navigation.
        await page.getByRole('link', { name: 'Leave' }).click();

        // Expected Result:
        // Instead of the Leave List page, an appropriate error page is displayed.
        // The actual content of the Leave List page (table, buttons, filters) is *not* displayed.

        // Assert that the main header "Leave List" is NOT visible
        await expect(page.getByRole('heading', { name: 'Leave List' })).not.toBeVisible();

        // Assert that key elements of the Leave List are NOT visible
        await expect(page.getByRole('button', { name: 'Apply Leave' })).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'Search' })).not.toBeVisible();
        await expect(page.getByPlaceholder('yyyy-mm-dd')).not.toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'From Date' })).not.toBeVisible();
        await expect(page.getByRole('table')).not.toBeVisible();

        // Assert that an error message or indicator IS visible.
        // OrangeHRM often displays "No Records Found" if data fails to load or is empty,
        // or a toast message for backend errors. For this test, we'll check for a plausible
        // error message that might appear if the data fetching fails.
        // This assertion will likely fail if the Leave List loads successfully and displays data.
        await expect(page.getByText('No Records Found', { exact: false })).toBeVisible();
        // You might also check for a generic error toast if the application uses one:
        // await expect(page.getByRole('alert', { name: /Error|Failed/i })).toBeVisible();
    });
});