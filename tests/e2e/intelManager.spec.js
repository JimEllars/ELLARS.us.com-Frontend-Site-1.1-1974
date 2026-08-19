import { test, expect } from '@playwright/test';

test.describe('Intelligence Manager Form Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user session storage via Zustand
    await page.addInitScript(() => {
      window.localStorage.setItem('ellars_us_com_preferences', JSON.stringify({
        state: {
          userToken: 'test-mock-token-12345',
          isAuthenticated: true,
          _hasHydrated: true
        }
      }));
    });

    // Intercept Supabase API calls
    await page.route('**/rest/v1/axim_vault*', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        expect(postData.app_id).toBe('ellars.us.com');
        expect(route.request().headers()['x-axim-tenant']).toBe('ELLARS_PERSONAL');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'test-uuid-1', ...postData }]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    // Mock initial vault fetch
    await page.route('**/rest/v1/axim_vault?select=*&app_id=eq.ellars.us.com', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
        });
    });

    await page.goto('/dashboard?tab=intel-manager');
  });

  test('Validates client-side inputs and submits successfully', async ({ page }) => {
    // Wait for the IntelManager to load inside MicroProgramLoader
    await expect(page.getByRole('heading', { name: /Intelligence Manager/i })).toBeVisible({ timeout: 10000 });

    // Submit empty form to trigger validation errors
    await page.getByRole('button', { name: /Commit Payload/i }).click();

    // Verify Title error
    await expect(page.locator('#intel-title-error')).toHaveText('Brief Title is required.');

    // Fill required fields
    await page.getByLabel(/Brief Title/i).fill('Operation Vanguard');
    await page.getByLabel(/Executive Summary/i).fill('Initial deployment strategy.');
    await page.getByLabel(/Operational Tags/i).fill('strategy, planning, execution'); // Valid comma separated
    await page.getByLabel(/Intelligence Body Payload/i).fill('Full payload parameters.');

    // Submit valid form
    await page.getByRole('button', { name: /Commit Payload/i }).click();

    // Ensure success toast appears
    await expect(page.getByText('Intelligence brief securely compiled and vaulted.')).toBeVisible();

    // Verify form resets
    await expect(page.getByLabel(/Brief Title/i)).toBeEmpty();
  });

  test('Validates incorrect tag format', async ({ page }) => {
     await expect(page.getByRole('heading', { name: /Intelligence Manager/i })).toBeVisible({ timeout: 10000 });

     await page.getByLabel(/Brief Title/i).fill('Test');
     await page.getByLabel(/Intelligence Body Payload/i).fill('Test');
     // Invalid tags (missing comma between distinct words or symbols that break comma separation logic)
     // Actually our regex is: /^[a-zA-Z0-9\s-]+(,[a-zA-Z0-9\s-]+)*$/
     await page.getByLabel(/Operational Tags/i).fill('invalid tag format @#$');

     await page.getByRole('button', { name: /Commit Payload/i }).click();

     await expect(page.locator('#intel-tags-error')).toHaveText('Tags must be strictly comma-separated.');
  });
});
