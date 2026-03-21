import { test, expect } from '@playwright/test';
import { loginProgrammatically } from './helpers/auth';

/**
 * Dashboard E2E tests.
 *
 * Tests require an authenticated session.  We use programmatic login
 * (token injection) for speed.  If the API is not available the token
 * injection still populates localStorage so the DashboardShell renders.
 *
 * The shell fetches /auth/me on mount — if that fails it redirects to /login.
 * Tests that rely on the full authenticated experience need a live API.
 * Tests that only verify static UI structure are still meaningful without one.
 */
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginProgrammatically(page);
  });

  // ── Navigation to dashboard ───────────────────────────────────────────────

  test('navigating to /dashboard after login loads the dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    // The URL should remain at /dashboard (not redirect to /login)
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('dashboard page title contains Social Pro', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/Social Pro/);
  });

  // ── Sidebar ───────────────────────────────────────────────────────────────

  test('sidebar is visible on desktop', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = page.locator('aside');
    await expect(sidebar.first()).toBeVisible();
  });

  test('sidebar shows Social Pro brand', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = page.locator('aside').first();
    await expect(sidebar.getByText('Social Pro')).toBeVisible();
    await expect(sidebar.getByText('Agency Platform')).toBeVisible();
  });

  test('sidebar navigation contains all expected links', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });

    const navLinks = [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Posts', href: '/dashboard/posts' },
      { name: 'Clients', href: '/dashboard/clients' },
      { name: 'Social Accounts', href: '/dashboard/social-accounts' },
      { name: 'Analytics', href: '/dashboard/analytics' },
      { name: 'AI Content', href: '/dashboard/ai' },
      { name: 'Team', href: '/dashboard/team' },
      { name: 'Billing', href: '/dashboard/billing' },
      { name: 'Settings', href: '/dashboard/settings' },
    ];

    for (const { name, href } of navLinks) {
      const link = nav.getByRole('link', { name });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', href);
    }
  });

  test('AI Content nav item shows "New" badge', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    // The badge text "New" appears next to the AI Content link
    await expect(nav.getByText('New')).toBeVisible();
  });

  test('sidebar has collapse/expand button', async ({ page }) => {
    await page.goto('/dashboard');
    const collapseBtn = page.getByRole('button', { name: 'Collapse sidebar' });
    await expect(collapseBtn).toBeVisible();
  });

  test('sidebar collapses when collapse button is clicked', async ({ page }) => {
    await page.goto('/dashboard');
    const collapseBtn = page.getByRole('button', { name: 'Collapse sidebar' });
    await collapseBtn.click();

    // After collapse the button label changes
    const expandBtn = page.getByRole('button', { name: 'Expand sidebar' });
    await expect(expandBtn).toBeVisible();

    // Re-expand
    await expandBtn.click();
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
  });

  // ── Sidebar navigation ────────────────────────────────────────────────────

  test('clicking Posts in sidebar navigates to /dashboard/posts', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'Posts' }).click();
    await expect(page).toHaveURL('/dashboard/posts');
  });

  test('clicking Clients in sidebar navigates to /dashboard/clients', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'Clients' }).click();
    await expect(page).toHaveURL('/dashboard/clients');
  });

  test('clicking Analytics in sidebar navigates to /dashboard/analytics', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'Analytics' }).click();
    await expect(page).toHaveURL('/dashboard/analytics');
  });

  test('clicking Billing in sidebar navigates to /dashboard/billing', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'Billing' }).click();
    await expect(page).toHaveURL('/dashboard/billing');
  });

  test('clicking Settings in sidebar navigates to /dashboard/settings', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/dashboard/settings');
  });

  // ── Header ────────────────────────────────────────────────────────────────

  test('header is visible', async ({ page }) => {
    await page.goto('/dashboard');
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('header contains notifications bell button', async ({ page }) => {
    await page.goto('/dashboard');
    const bellBtn = page.getByRole('button', { name: 'View notifications' });
    await expect(bellBtn).toBeVisible();
  });

  test('header contains user menu button', async ({ page }) => {
    await page.goto('/dashboard');
    const userMenuBtn = page.getByRole('button', { name: 'User menu' });
    await expect(userMenuBtn).toBeVisible();
  });

  test('header has breadcrumb navigation', async ({ page }) => {
    await page.goto('/dashboard');
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Dashboard');
  });

  test('breadcrumb updates when navigating to sub-pages', async ({ page }) => {
    await page.goto('/dashboard/clients');
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumb).toContainText('Dashboard');
    await expect(breadcrumb).toContainText('Clients');
  });

  test('user menu opens and shows profile options', async ({ page }) => {
    await page.goto('/dashboard');
    const userMenuBtn = page.getByRole('button', { name: 'User menu' });
    await userMenuBtn.click();

    // The dropdown should show navigation items
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Agency Settings' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Billing' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign out/i })).toBeVisible();
  });

  // ── Dashboard content ─────────────────────────────────────────────────────

  test('dashboard shows "Welcome to Social Pro" heading', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome to Social Pro' })).toBeVisible();
  });

  test('dashboard shows 4 stat cards', async ({ page }) => {
    await page.goto('/dashboard');
    const statLabels = ['Total Clients', 'Social Accounts', 'Scheduled Posts', 'AI Credits Used'];
    for (const label of statLabels) {
      await expect(page.getByText(label)).toBeVisible();
    }
  });

  test('dashboard shows Quick actions section', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('region', { name: 'Quick actions' })).toBeVisible();
  });

  test('dashboard quick actions contain Create Post, Add Client, Connect Account', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /Create Post/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Add Client/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Connect Account/i })).toBeVisible();
  });

  test('dashboard shows Recent activity section', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('region', { name: 'Recent activity' })).toBeVisible();
  });

  test('dashboard shows Getting started checklist', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('region', { name: 'Getting started' })).toBeVisible();
    await expect(page.getByText('Get started with Social Pro')).toBeVisible();
  });

  // ── Sign out ──────────────────────────────────────────────────────────────

  test('sign out via user menu redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');

    // Open user menu
    await page.getByRole('button', { name: 'User menu' }).click();
    // Click sign out
    await page.getByRole('button', { name: /Sign out/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('sign out via sidebar user section works', async ({ page }) => {
    await page.goto('/dashboard');

    // The sidebar user section has a sign out button
    const signOutBtn = page.getByRole('button', { name: 'Sign out' }).first();
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    await expect(page).toHaveURL('/login');
  });
});
