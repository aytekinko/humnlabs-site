const { test: base, expect } = require('@playwright/test');

const allowedHosts = new Set(['127.0.0.1', 'localhost']);

const test = base.extend({
  networkGuard: [
    async ({ context }, use) => {
      const externalRequests = [];

      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        const isHttpRequest = url.protocol === 'http:' || url.protocol === 'https:';

        if (isHttpRequest && !allowedHosts.has(url.hostname)) {
          externalRequests.push(url.href);
          await route.abort('blockedbyclient');
          return;
        }

        await route.continue();
      });

      await use();

      expect(
        externalRequests,
        `Unexpected external HTTP(S) requests: ${externalRequests.join(', ')}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

test('homepage loads locally and exposes visible main content', async ({ page }) => {
  const response = await page.goto('/');

  expect(response && response.ok()).toBe(true);
  await expect(page.locator('main#main-content')).toBeVisible();
});

test('mobile navigation opens and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const toggle = page.locator('.mobile-nav-toggle');
  const navigation = page.locator('#main-nav');

  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation).toHaveClass(/\bactive\b/);
  await expect(navigation).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).not.toHaveClass(/\bactive\b/);
  await expect(navigation).toBeHidden();
});

test('waitlist email uses native validation without submission', async ({ page }) => {
  await page.goto('/');

  const email = page.locator('form.waitlist-form input[name="email"]');

  await expect(email).toHaveAttribute('type', 'email');
  await expect(email).toHaveAttribute('required', '');
  expect(await email.evaluate((input) => input.required)).toBe(true);
  expect(await email.evaluate((input) => input.checkValidity())).toBe(false);

  await email.fill('not-an-email');
  expect(await email.evaluate((input) => input.checkValidity())).toBe(false);

  await email.fill('person@example.com');
  expect(await email.evaluate((input) => input.checkValidity())).toBe(true);
});

test('privacy and terms links exist and resolve locally', async ({ page }) => {
  await page.goto('/');

  expect(await page.locator('a[href="/privacy/"]').count()).toBeGreaterThan(0);
  expect(await page.locator('a[href="/terms/"]').count()).toBeGreaterThan(0);

  const privacyResponse = await page.goto('/privacy/');
  expect(privacyResponse && privacyResponse.ok()).toBe(true);
  await expect(page.locator('main#main-content')).toBeVisible();

  const termsResponse = await page.goto('/terms/');
  expect(termsResponse && termsResponse.ok()).toBe(true);
  await expect(page.locator('main#main-content')).toBeVisible();
});

test('experiment link exists on the homepage', async ({ page }) => {
  await page.goto('/');

  expect(await page.locator('a[href="/experiment"]').count()).toBeGreaterThan(0);
});
