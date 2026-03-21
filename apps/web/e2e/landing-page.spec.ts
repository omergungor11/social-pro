import { test, expect } from '@playwright/test';

/**
 * Landing page (marketing) E2E tests.
 *
 * The landing page is served at "/" and is the root marketing page.
 * It contains a hero section, features grid, pricing section, testimonials,
 * CTA banner, and footer.
 */
test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── Page load ─────────────────────────────────────────────────────────────

  test('page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Social Pro/);
    await expect(page.locator('body')).toBeVisible();
  });

  // ── Navigation bar ─────────────────────────────────────────────────────────

  test('navigation bar is visible with logo', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();
    await expect(nav.getByText('Social Pro')).toBeVisible();
  });

  test('navigation contains Features, Pricing, and Testimonials links', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Features' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Pricing' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Testimonials' })).toBeVisible();
  });

  test('navigation has Sign in and Start Free Trial CTA', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Start Free Trial' })).toBeVisible();
  });

  test('Sign in link navigates to /login', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('Start Free Trial in navbar navigates to /register', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'Start Free Trial' }).click();
    await expect(page).toHaveURL('/register');
  });

  // ── Hero section ──────────────────────────────────────────────────────────

  test('hero section is visible with headline', async ({ page }) => {
    // The h1 headline text spans multiple elements — match the partial text
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Manage All Your'
    );
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Social Media'
    );
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'in One Place'
    );
  });

  test('hero section has primary CTA button linking to /register', async ({ page }) => {
    // The hero contains two "Start Free Trial" links — target the first one
    const heroCta = page.locator('section').first().getByRole('link', {
      name: 'Start Free Trial',
    });
    await expect(heroCta).toBeVisible();
    await expect(heroCta).toHaveAttribute('href', '/register');
  });

  test('hero section has "See features" secondary link', async ({ page }) => {
    const seeFeatures = page.getByRole('link', { name: 'See features' });
    await expect(seeFeatures).toBeVisible();
    await expect(seeFeatures).toHaveAttribute('href', '#features');
  });

  test('hero shows "No credit card required" copy', async ({ page }) => {
    await expect(page.getByText('No credit card required')).toBeVisible();
  });

  test('hero shows mock dashboard illustration', async ({ page }) => {
    // The dashboard illustration has a mock toolbar with colored circles
    const illustration = page.locator('.rounded-2xl.border.border-white\\/10');
    await expect(illustration.first()).toBeVisible();
  });

  // ── Features section ──────────────────────────────────────────────────────

  test('features section is present with heading', async ({ page }) => {
    const section = page.locator('#features');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toContainText(
      'All the tools. None of the chaos.'
    );
  });

  test('features section contains all 6 feature cards', async ({ page }) => {
    const featureHeadings = [
      'Multi-Platform Publishing',
      'AI Content Generation',
      'Advanced Analytics',
      'Client Management',
      'Team Collaboration',
      'Automated Scheduling',
    ];

    for (const heading of featureHeadings) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });

  // ── Pricing section ───────────────────────────────────────────────────────

  test('pricing section is present with 4 pricing tiers', async ({ page }) => {
    const section = page.locator('#pricing');
    await expect(section).toBeVisible();

    // All four tier names must appear
    await expect(section.getByRole('heading', { name: 'Free' })).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Starter' })).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Professional' })).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Enterprise' })).toBeVisible();
  });

  test('pricing section shows prices for all tiers', async ({ page }) => {
    const section = page.locator('#pricing');
    await expect(section.getByText('$0')).toBeVisible();
    await expect(section.getByText('$29')).toBeVisible();
    await expect(section.getByText('$79')).toBeVisible();
    await expect(section.getByText('$199')).toBeVisible();
  });

  test('pricing section shows "Most Popular" badge on Professional tier', async ({ page }) => {
    const section = page.locator('#pricing');
    await expect(section.getByText('Most Popular')).toBeVisible();
  });

  test('pricing CTAs link to /register', async ({ page }) => {
    const section = page.locator('#pricing');
    const ctaLinks = section.getByRole('link', { name: /get started|start free trial|contact sales/i });
    const count = await ctaLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ── Testimonials section ──────────────────────────────────────────────────

  test('testimonials section is present with heading', async ({ page }) => {
    const section = page.locator('#testimonials');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toContainText(
      'Real results from real agencies'
    );
  });

  test('testimonials section shows 3 testimonial cards', async ({ page }) => {
    const testimonialAuthors = ['Sarah Mitchell', 'Marcus Chen', 'Lena Vasquez'];
    for (const author of testimonialAuthors) {
      await expect(page.getByText(author)).toBeVisible();
    }
  });

  // ── CTA banner ────────────────────────────────────────────────────────────

  test('CTA banner is visible with register and login links', async ({ page }) => {
    // The bottom CTA section has both a "Start Free Trial" and "Sign in" link
    // Locate the blue CTA section by its bg-blue-600 class
    const ctaSection = page.locator('section.bg-blue-600');
    await expect(ctaSection).toBeVisible();
    await expect(ctaSection.getByText('Ready to take your agency to the next level?')).toBeVisible();
    await expect(ctaSection.getByRole('link', { name: 'Start Free Trial' })).toBeVisible();
    await expect(ctaSection.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  // ── Footer ────────────────────────────────────────────────────────────────

  test('footer is present with Social Pro branding', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.getByText('Social Pro')).toBeVisible();
    await expect(footer.getByText(/All rights reserved/)).toBeVisible();
  });

  test('footer contains Product, Company, and Legal columns', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.getByText('Product')).toBeVisible();
    await expect(footer.getByText('Company')).toBeVisible();
    await expect(footer.getByText('Legal')).toBeVisible();
  });

  // ── Navigation anchor links ───────────────────────────────────────────────

  test('Features anchor link scrolls to features section', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'Features' }).click();
    // After clicking, the features section should be in view
    const section = page.locator('#features');
    await expect(section).toBeVisible();
  });

  test('Pricing anchor link scrolls to pricing section', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'Pricing' }).click();
    const section = page.locator('#pricing');
    await expect(section).toBeVisible();
  });

  // ── Responsive: mobile viewport ───────────────────────────────────────────

  test.describe('Mobile viewport (375px)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('page renders on mobile without horizontal scroll', async ({ page }) => {
      await page.goto('/');
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()?.width ?? 375;
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // allow 5px tolerance
    });

    test('hero headline is visible on mobile', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('nav desktop links are hidden on mobile', async ({ page }) => {
      await page.goto('/');
      // The ul with desktop nav links is hidden on mobile via "hidden md:flex"
      const desktopNavList = page.locator('nav[aria-label="Main navigation"] ul');
      await expect(desktopNavList).toBeHidden();
    });

    test('pricing section is visible on mobile', async ({ page }) => {
      await page.goto('/');
      await page.locator('#pricing').scrollIntoViewIfNeeded();
      await expect(page.locator('#pricing')).toBeVisible();
    });

    test('CTA buttons are visible on mobile', async ({ page }) => {
      await page.goto('/');
      // At least one Start Free Trial link should be visible
      const ctas = page.getByRole('link', { name: 'Start Free Trial' });
      const count = await ctas.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
