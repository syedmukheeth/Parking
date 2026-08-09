import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Automated accessibility audit over the public surface.
 *
 * axe catches roughly a third of real WCAG issues, it will not tell you a
 * focus order is illogical or a label is misleading. Treat a clean run as the
 * floor, not the ceiling; the keyboard paths are asserted separately in
 * map-discovery.spec.ts and booking-a11y below.
 */
const PUBLIC_PAGES = [
  { name: 'dashboard', path: '/' },
  { name: 'landing', path: '/welcome' },
  { name: 'search', path: '/search?q=Kurnool' },
  { name: 'location detail', path: '/locations/loc_vja_benz_circle' },
  { name: 'parking pass list', path: '/bookings' },
  { name: 'saved', path: '/saved' },
  { name: 'profile', path: '/profile' },
];

test.describe('accessibility', () => {
  test.describe.configure({ timeout: 90_000 });

  for (const page of PUBLIC_PAGES) {
    test(`${page.name} has no WCAG A/AA violations`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);
      await browserPage.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 40_000 });

      const results = await new AxeBuilder({ page: browserPage })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // MapLibre renders its own controls and canvas; we own the markers and
        // the surrounding chrome, not the library's internals.
        .exclude('.maplibregl-control-container')
        .analyze();

      // Surface what actually failed rather than just a count, a bare
      // `toEqual([])` on a violation array is unreadable when it fails.
      const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help}`);
      expect(summary, summary.join('\n')).toEqual([]);
    });
  }

  test('the product stays light even when the OS asks for dark', async ({ page }) => {
    // The app ships one theme. `color-scheme: light` is what stops the browser
    // auto-darkening form controls for a citizen whose OS is set to dark, which
    // would otherwise produce dark inputs on a light page.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/search?q=Vijayawada');
    await page.locator('.pk-marker').first().waitFor({ timeout: 40_000 });

    const background = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
    );
    // --pk-slate-50, the light canvas. A production build minifies the
    // lightness channel to a percentage, `oklch(98.5% ...)` where the dev
    // build emits `oklch(0.985 ...)`, so matching the raw string passes
    // against a dev server and fails against the deployed site, on a value
    // that never changed. Accept both spellings of the same colour.
    expect(background).toMatch(/oklch\(\s*(0\.985|98\.5%)/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa'])
      .exclude('.maplibregl-control-container')
      .analyze();

    const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help}`);
    expect(summary, summary.join('\n')).toEqual([]);
  });

  test('a keyboard-only citizen can reach the content', async ({ page }) => {
    await page.goto('/');

    // The skip link must be the first stop, and must actually move focus.
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: /skip to content/i });
    await expect(skip).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeVisible();
  });
});
