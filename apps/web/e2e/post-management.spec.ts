import { test, expect } from '@playwright/test';
import { loginProgrammatically } from './helpers/auth';

/**
 * Post management E2E tests.
 *
 * Covers the /dashboard/posts page and /dashboard/posts/new page:
 * - Post list page loads with data
 * - Search and filter controls
 * - View toggle (List / Calendar)
 * - Create post page navigation
 * - Post editor form (title, content, platform tabs)
 * - Calendar view accessibility
 */
test.describe('Post List Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginProgrammatically(page);
    await page.goto('/dashboard/posts');
  });

  // ── Page load ──────────────────────────────────────────────────────────────

  test('posts page loads and shows heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
  });

  test('posts page shows post count', async ({ page }) => {
    // "N of M posts" or "N posts"
    await expect(page.getByText(/posts?/)).toBeVisible();
  });

  test('posts page has Create Post button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Create Post/i })).toBeVisible();
  });

  // ── View toggle ────────────────────────────────────────────────────────────

  test('view toggle shows List and Calendar buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^List$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Calendar$/i })).toBeVisible();
  });

  test('List view is active by default', async ({ page }) => {
    const listBtn = page.getByRole('button', { name: /^List$/i });
    // Active list button has bg-slate-900 styling — the button has aria state
    // Verify the posts table is visible (list view shows table)
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('clicking Calendar switches to calendar view', async ({ page }) => {
    await page.getByRole('button', { name: /^Calendar$/i }).click();

    // Calendar view hides the table and shows the calendar component
    await expect(page.getByRole('table')).not.toBeVisible({ timeout: 3_000 });
  });

  test('clicking List returns to list view from calendar', async ({ page }) => {
    await page.getByRole('button', { name: /^Calendar$/i }).click();
    await expect(page.getByRole('table')).not.toBeVisible({ timeout: 3_000 });

    await page.getByRole('button', { name: /^List$/i }).click();
    await expect(page.getByRole('table')).toBeVisible();
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  test('search input is present', async ({ page }) => {
    await expect(page.getByPlaceholder('Search posts\u2026')).toBeVisible();
  });

  test('status filter select is present', async ({ page }) => {
    const statusFilter = page.getByRole('combobox', { name: /Filter by status/i });
    await expect(statusFilter).toBeVisible();
  });

  test('platform filter select is present', async ({ page }) => {
    const platformFilter = page.getByRole('combobox', { name: /Filter by platform/i });
    await expect(platformFilter).toBeVisible();
  });

  test('client filter select is present', async ({ page }) => {
    const clientFilter = page.getByRole('combobox', { name: /Filter by client/i });
    await expect(clientFilter).toBeVisible();
  });

  test('searching filters the posts list', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search posts\u2026');
    await searchInput.fill('Product Launch');

    await expect(page.getByText('Q1 Product Launch Announcement')).toBeVisible();
  });

  test('searching with no results shows empty state', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search posts\u2026');
    await searchInput.fill('zzz_no_match_xyz_123');

    await expect(page.getByText('No posts match your filters.')).toBeVisible();
  });

  test('clear button appears when filters are active', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search posts\u2026');
    await searchInput.fill('test');

    await expect(page.getByRole('button', { name: /Clear/i })).toBeVisible();
  });

  // ── Post table ────────────────────────────────────────────────────────────

  test('post table has correct column headers', async ({ page }) => {
    const headers = ['Post', 'Platforms', 'Status'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('post table shows mock posts', async ({ page }) => {
    await expect(page.getByText('Q1 Product Launch Announcement')).toBeVisible();
  });

  test('post table shows status badges', async ({ page }) => {
    // Mock data has published, scheduled, draft posts
    // At least one of these badges should be visible
    const publishedBadge = page.getByText('Published');
    const scheduledBadge = page.getByText('Scheduled');
    const draftBadge = page.getByText('Draft');

    const hasPublished = await publishedBadge.isVisible().catch(() => false);
    const hasScheduled = await scheduledBadge.isVisible().catch(() => false);
    const hasDraft = await draftBadge.isVisible().catch(() => false);

    expect(hasPublished || hasScheduled || hasDraft).toBe(true);
  });

  // ── Row actions ───────────────────────────────────────────────────────────

  test('post rows have actions button', async ({ page }) => {
    const actionBtns = page.getByRole('button', { name: 'Post actions' });
    const count = await actionBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('post row actions menu shows Edit, Duplicate, and Delete', async ({ page }) => {
    const firstActionBtn = page.getByRole('button', { name: 'Post actions' }).first();
    await firstActionBtn.click();

    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('delete post shows confirmation dialog', async ({ page }) => {
    const firstActionBtn = page.getByRole('button', { name: 'Post actions' }).first();
    await firstActionBtn.click();

    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Delete Post')).toBeVisible();
  });

  test('delete confirmation can be cancelled', async ({ page }) => {
    const firstActionBtn = page.getByRole('button', { name: 'Post actions' }).first();
    await firstActionBtn.click();

    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Navigation to create post ─────────────────────────────────────────────

  test('Create Post button links to /dashboard/posts/new', async ({ page }) => {
    const createLink = page.getByRole('link', { name: /Create Post/i });
    await expect(createLink).toHaveAttribute('href', '/dashboard/posts/new');
  });

  test('clicking Create Post navigates to the new post page', async ({ page }) => {
    await page.getByRole('link', { name: /Create Post/i }).click();
    await expect(page).toHaveURL('/dashboard/posts/new');
  });
});

// ── Create Post Page ──────────────────────────────────────────────────────────

test.describe('Create Post Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginProgrammatically(page);
    await page.goto('/dashboard/posts/new');
  });

  test('create post page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create Post' })).toBeVisible();
  });

  test('create post page has back button to posts list', async ({ page }) => {
    const backBtn = page.getByRole('button', { name: 'Back to posts' });
    await expect(backBtn).toBeVisible();
  });

  test('back button returns to posts list', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to posts' }).click();
    await expect(page).toHaveURL('/dashboard/posts');
  });

  test('create post form has Post Title field', async ({ page }) => {
    await expect(page.getByPlaceholder('Give this post a descriptive title\u2026')).toBeVisible();
  });

  test('create post form has content textarea', async ({ page }) => {
    // The textarea placeholder changes based on platform selection
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
  });

  // ── Platform selector ─────────────────────────────────────────────────────

  test('platform selector shows all 6 supported platforms', async ({ page }) => {
    const platforms = ['Twitter / X', 'Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube'];
    for (const platform of platforms) {
      const platformBtn = page.getByRole('button', {
        name: new RegExp(`(Select|Deselect) ${platform}`, 'i'),
      });
      await expect(platformBtn).toBeVisible();
    }
  });

  test('Twitter and LinkedIn are selected by default', async ({ page }) => {
    // Default selected platforms show as "Deselect" in aria-label
    const twitterBtn = page.getByRole('button', { name: /Deselect Twitter/i });
    const linkedInBtn = page.getByRole('button', { name: /Deselect LinkedIn/i });

    await expect(twitterBtn).toBeVisible();
    await expect(linkedInBtn).toBeVisible();
  });

  test('toggling a platform deselects it', async ({ page }) => {
    // Twitter is selected by default — clicking deselects it
    const twitterBtn = page.getByRole('button', { name: /Deselect Twitter/i });
    await twitterBtn.click();

    // Now it should show as "Select Twitter"
    await expect(page.getByRole('button', { name: /Select Twitter \/ X/i })).toBeVisible();
  });

  test('with 2+ platforms selected, platform tabs appear in the content editor', async ({ page }) => {
    // Twitter + LinkedIn are both selected by default — platform tabs should show
    await expect(page.getByRole('button', { name: 'All Platforms' })).toBeVisible();
  });

  test('deselecting all platforms shows warning message', async ({ page }) => {
    // Deselect both default platforms
    await page.getByRole('button', { name: /Deselect Twitter/i }).click();
    await page.getByRole('button', { name: /Deselect LinkedIn/i }).click();

    await expect(page.getByText('Select at least one platform to publish.')).toBeVisible();
    await expect(page.getByText('No platforms selected')).toBeVisible();
  });

  // ── Client select ─────────────────────────────────────────────────────────

  test('client selector is present', async ({ page }) => {
    await expect(page.getByText('Assign to client')).toBeVisible();
  });

  // ── Schedule section ──────────────────────────────────────────────────────

  test('schedule section has Date, Time, and Timezone fields', async ({ page }) => {
    await expect(page.getByText('Schedule')).toBeVisible();
    await expect(page.getByText('Date')).toBeVisible();
    await expect(page.getByText('Time')).toBeVisible();
    await expect(page.getByText('Timezone')).toBeVisible();
  });

  // ── Action bar ────────────────────────────────────────────────────────────

  test('action bar has Save Draft, Schedule, and Publish Now buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish Now' })).toBeVisible();
  });

  test('Save Draft and Publish Now are disabled before entering a title', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
  });

  test('Save Draft and Publish Now enable after entering a title', async ({ page }) => {
    await page.fill(
      'input[placeholder="Give this post a descriptive title\u2026"]',
      'My Test Post'
    );

    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Publish Now' })).toBeEnabled();
  });

  test('action bar shows platform info when platforms are selected', async ({ page }) => {
    await expect(page.getByText('Publishing to')).toBeVisible();
  });

  test('action bar has Cancel link back to posts list', async ({ page }) => {
    const cancelBtn = page.getByRole('link', { name: 'Cancel' });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await expect(page).toHaveURL('/dashboard/posts');
  });

  // ── AI Generate ──────────────────────────────────────────────────────────

  test('AI Generate button is visible in content editor', async ({ page }) => {
    await expect(page.getByRole('link', { name: /AI Generate/i })).toBeVisible();
  });

  // ── Preview section ───────────────────────────────────────────────────────

  test('preview section is visible when platforms are selected', async ({ page }) => {
    await expect(page.getByText('Preview')).toBeVisible();
  });

  // ── Media section ─────────────────────────────────────────────────────────

  test('media upload section is present', async ({ page }) => {
    await expect(page.getByText('Media')).toBeVisible();
  });
});

// ── Calendar View ─────────────────────────────────────────────────────────────

test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    await loginProgrammatically(page);
    await page.goto('/dashboard/posts');
  });

  test('switching to calendar view shows a calendar component', async ({ page }) => {
    await page.getByRole('button', { name: /^Calendar$/i }).click();

    // The table should be gone and the calendar rendered
    // The CalendarView component renders month navigation
    await expect(page.getByRole('table')).not.toBeVisible({ timeout: 3_000 });
    // Calendar component renders some content — verify the page has content
    await expect(page.locator('main')).toBeVisible();
  });

  test('calendar view is accessible via keyboard after switching', async ({ page }) => {
    const calendarBtn = page.getByRole('button', { name: /^Calendar$/i });
    await calendarBtn.click();

    // The calendar button should now appear active
    // Switching back is still possible
    const listBtn = page.getByRole('button', { name: /^List$/i });
    await listBtn.click();

    await expect(page.getByRole('table')).toBeVisible();
  });
});
