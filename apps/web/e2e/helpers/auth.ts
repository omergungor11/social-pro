import { type Page } from '@playwright/test';

/**
 * Test user credentials — matches the dev seed in the API.
 * The login page auto-logins with these credentials in development mode
 * (DEV_MODE auto-login is triggered by the absence of sp_access_token).
 * For programmatic login we POST directly to the API.
 */
export const TEST_USER = {
  email: 'admin@socialpro.dev',
  password: '159753*a',
  name: 'Admin',
} as const;

/** API base URL used by the frontend. */
const API_BASE_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Local storage key used by the frontend to store the access token. */
const ACCESS_TOKEN_KEY = 'sp_access_token';
const REFRESH_TOKEN_KEY = 'sp_refresh_token';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Programmatically log in by calling the API directly and injecting
 * the token into localStorage.  This avoids navigating through the login
 * UI on every test that needs an authenticated session.
 *
 * Usage:
 *   test.beforeEach(async ({ page }) => {
 *     await loginProgrammatically(page);
 *   });
 */
export async function loginProgrammatically(page: Page): Promise<void> {
  // Navigate to any page first so we have a browsing context with the
  // correct origin (required to set localStorage for that origin).
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  // POST credentials directly to the API.
  const response = await page.request.post(`${API_BASE_URL}/api/v1/auth/login`, {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });

  if (response.ok()) {
    const tokens = (await response.json()) as AuthTokens;
    await page.evaluate(
      ({ key, token }) => {
        localStorage.setItem(key, token);
      },
      { key: ACCESS_TOKEN_KEY, token: tokens.accessToken }
    );

    if (tokens.refreshToken) {
      await page.evaluate(
        ({ key, token }) => {
          localStorage.setItem(key, token);
        },
        { key: REFRESH_TOKEN_KEY, token: tokens.refreshToken }
      );
    }
  } else {
    // If the API is not running (offline E2E run), fall back to injecting a
    // placeholder token so the dashboard renders its UI without redirecting.
    // Tests that rely on real API data will need a live backend.
    await page.evaluate(
      ({ key }) => {
        localStorage.setItem(key, 'e2e-test-placeholder-token');
      },
      { key: ACCESS_TOKEN_KEY }
    );
  }
}

/**
 * Clear authentication tokens from localStorage.
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(
    ({ accessKey, refreshKey }) => {
      localStorage.removeItem(accessKey);
      localStorage.removeItem(refreshKey);
    },
    { accessKey: ACCESS_TOKEN_KEY, refreshKey: REFRESH_TOKEN_KEY }
  );
}

/**
 * Fill the login form and submit it through the UI.
 * Use this to test the actual login flow rather than for setup.
 */
export async function loginViaUI(
  page: Page,
  email = TEST_USER.email,
  password = TEST_USER.password
): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}
