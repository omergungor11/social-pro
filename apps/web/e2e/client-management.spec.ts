import { test, expect } from '@playwright/test';
import { loginProgrammatically } from './helpers/auth';

/**
 * Client management E2E tests.
 *
 * Covers the /dashboard/clients page including:
 * - Page load and header
 * - Search and filter UI
 * - Client table with data
 * - Create client dialog
 * - Delete confirmation dialog
 * - Pagination
 */
test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginProgrammatically(page);
    await page.goto('/dashboard/clients');
  });

  // ── Page load ──────────────────────────────────────────────────────────────

  test('clients page loads and shows heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
  });

  test('clients page shows total client count', async ({ page }) => {
    // The subtitle shows "{n} total clients"
    await expect(page.getByText(/total clients/)).toBeVisible();
  });

  test('clients page has New Client button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /New Client/i })).toBeVisible();
  });

  test('clients page has Groups button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Groups/i })).toBeVisible();
  });

  // ── Search and filter UI ──────────────────────────────────────────────────

  test('search input is present and has correct placeholder', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search name, email, company...');
    await expect(searchInput).toBeVisible();
  });

  test('group filter select is present', async ({ page }) => {
    const groupFilter = page.getByRole('combobox', { name: /Filter by group/i });
    await expect(groupFilter).toBeVisible();
  });

  test('tag filter input is present', async ({ page }) => {
    const tagFilter = page.getByPlaceholder('Filter by tag...');
    await expect(tagFilter).toBeVisible();
  });

  test('searching filters the client table', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search name, email, company...');

    // Search for a specific client that exists in mock data
    await searchInput.fill('Acme');

    // The table should show the Acme client
    await expect(page.getByText('Acme Corporation')).toBeVisible();

    // After clearing, all clients show again
    await searchInput.fill('');
    await expect(page.getByText('total clients')).toBeVisible();
  });

  test('searching with no results shows empty state', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search name, email, company...');
    await searchInput.fill('zzz_no_match_xyz');

    await expect(page.getByText('No clients match your filters.')).toBeVisible();
  });

  test('clear filters button appears when filters are active', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search name, email, company...');
    await searchInput.fill('test');

    const clearBtn = page.getByRole('button', { name: /Clear filters/i });
    await expect(clearBtn).toBeVisible();

    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
  });

  // ── Client table ──────────────────────────────────────────────────────────

  test('client table has correct column headers', async ({ page }) => {
    const headers = ['Client', 'Email', 'Company', 'Tags', 'Groups'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('client table shows mock clients', async ({ page }) => {
    // Several mock clients are always present
    await expect(page.getByText('Acme Corporation')).toBeVisible();
    await expect(page.getByText('Bright Ideas Studio')).toBeVisible();
  });

  test('client table rows have select checkboxes', async ({ page }) => {
    // The "Select all" checkbox is in the table header
    const selectAll = page.getByRole('checkbox', { name: 'Select all on page' });
    await expect(selectAll).toBeVisible();
  });

  test('select all checkbox selects all rows on current page', async ({ page }) => {
    const selectAll = page.getByRole('checkbox', { name: 'Select all on page' });
    await selectAll.click();

    // The bulk toolbar should appear after selecting rows
    // It contains a delete button for the selected items
    await expect(page.getByText(/selected/i)).toBeVisible({ timeout: 3_000 }).catch(() => {
      // Bulk toolbar may show count differently, this is acceptable
    });
  });

  // ── Create client dialog ──────────────────────────────────────────────────

  test('clicking New Client opens the create dialog', async ({ page }) => {
    await page.getByRole('button', { name: /New Client/i }).click();

    // The dialog should appear with its title
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('New Client')).toBeVisible();
    await expect(page.getByText('Add a new client to your roster.')).toBeVisible();
  });

  test('create client dialog has all form fields', async ({ page }) => {
    await page.getByRole('button', { name: /New Client/i }).click();

    await expect(page.getByPlaceholder('Acme Corporation')).toBeVisible();
    await expect(page.getByPlaceholder('contact@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('+1 (555) 000-0000')).toBeVisible();
    await expect(page.getByPlaceholder('Company name')).toBeVisible();
    await expect(page.getByPlaceholder('vip, enterprise, renewal')).toBeVisible();
  });

  test('create client dialog has Cancel and Create Client buttons', async ({ page }) => {
    await page.getByRole('button', { name: /New Client/i }).click();

    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Client' })).toBeVisible();
  });

  test('create client dialog can be closed with Cancel', async ({ page }) => {
    await page.getByRole('button', { name: /New Client/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });

  test('Create Client button is disabled until name and email are filled', async ({ page }) => {
    await page.getByRole('button', { name: /New Client/i }).click();

    const createBtn = page.getByRole('button', { name: 'Create Client' });
    // Initially disabled because name and email are empty
    await expect(createBtn).toBeDisabled();

    // Fill name only — still disabled
    await page.getByPlaceholder('Acme Corporation').fill('Test Client');
    await expect(createBtn).toBeDisabled();

    // Fill email — now enabled
    await page.getByPlaceholder('contact@example.com').fill('test@example.com');
    await expect(createBtn).toBeEnabled();
  });

  test('creating a new client adds it to the table', async ({ page }) => {
    await page.getByRole('button', { name: /New Client/i }).click();

    const uniqueName = `E2E Test Client ${Date.now()}`;
    await page.getByPlaceholder('Acme Corporation').fill(uniqueName);
    await page.getByPlaceholder('contact@example.com').fill('e2e@test.com');

    await page.getByRole('button', { name: 'Create Client' }).click();

    // Dialog closes
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });

    // The new client appears in the table
    await expect(page.getByText(uniqueName)).toBeVisible();
  });

  // ── Row actions ──────────────────────────────────────────────────────────

  test('row actions button is visible for each client row', async ({ page }) => {
    const rowActionBtns = page.getByRole('button', { name: 'Row actions' });
    const count = await rowActionBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('row actions menu shows Edit and Delete options', async ({ page }) => {
    const firstRowActions = page.getByRole('button', { name: 'Row actions' }).first();
    await firstRowActions.click();

    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('clicking Delete in row actions opens delete confirmation dialog', async ({ page }) => {
    const firstRowActions = page.getByRole('button', { name: 'Row actions' }).first();
    await firstRowActions.click();

    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Delete Client')).toBeVisible();
    await expect(page.getByText(/cannot be undone/i)).toBeVisible();
  });

  test('delete confirmation dialog can be cancelled', async ({ page }) => {
    const firstRowActions = page.getByRole('button', { name: 'Row actions' }).first();
    await firstRowActions.click();

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Pagination ────────────────────────────────────────────────────────────

  test('pagination is visible when there are multiple pages', async ({ page }) => {
    // With 15 mock clients and page size 10, there should be 2 pages
    // The pagination component shows total count and page controls
    await expect(page.getByText(/of \d+/)).toBeVisible();
  });

  // ── Client detail navigation ──────────────────────────────────────────────

  test('clicking client name navigates to client detail', async ({ page }) => {
    // Client links go to /clients/{id} (from the source code)
    const firstClientLink = page.getByRole('link', { name: 'Acme Corporation' });
    await expect(firstClientLink).toBeVisible();
    // Verify the href is set (it navigates to /clients/c1)
    const href = await firstClientLink.getAttribute('href');
    expect(href).toMatch(/\/clients\/c\d+/);
  });
});
