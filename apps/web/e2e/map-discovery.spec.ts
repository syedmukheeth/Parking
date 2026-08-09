import { expect, test } from '@playwright/test';

/**
 * The map-first discovery surface (docs/ROADMAP.md Phase 9).
 *
 * Worth an E2E rather than a component test: the thing that breaks here is
 * MapLibre actually initialising against real tiles and the marker DOM being
 * created outside React's tree. A jsdom test would assert nothing real.
 */
test.describe('map discovery', () => {
  // MapLibre plus its tiles is a heavy first paint, and against a dev server
  // the chunk is compiled on demand. The default 30s budget is not enough for
  // the first test to both compile and reach a painted map.
  test.describe.configure({ timeout: 90_000 });

  test('renders markers coloured by availability, with the count as the label', async ({ page }) => {
    await page.goto('/search?q=Kurnool');

    const markers = page.locator('.pk-marker');
    await expect(markers.first()).toBeVisible({ timeout: 45_000 });

    // One marker per result, rather than a hardcoded number that breaks every
    // time the catalogue grows. A mismatch here means the map and the list
    // disagree about what was found, which is the bug worth catching.
    const reported = Number((await page.getByText(/lots found/i).first().innerText()).match(/\d+/)?.[0]);
    expect(reported).toBeGreaterThan(0);
    await expect(markers).toHaveCount(reported);

    // Colour never travels alone, every marker carries a readable label.
    for (const marker of await markers.all()) {
      const status = await marker.getAttribute('data-status');
      expect(['available', 'limited', 'full']).toContain(status);

      const label = await marker.getAttribute('aria-label');
      expect(label).toMatch(/\w+, (\d+ free|Full)/);
    }
  });

  test('markers are real buttons, reachable and operable from the keyboard', async ({ page }) => {
    await page.goto('/search?q=Kurnool');
    const marker = page.locator('.pk-marker').first();
    await expect(marker).toBeVisible({ timeout: 45_000 });

    await expect(marker).toHaveJSProperty('tagName', 'BUTTON');

    await marker.focus();
    await expect(marker).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(marker).toHaveAttribute('aria-pressed', 'true');
  });

  test('selecting a marker highlights the matching card in the list', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/search?q=Kurnool');

    const marker = page.locator('.pk-marker').first();
    await expect(marker).toBeVisible({ timeout: 45_000 });

    const name = (await marker.getAttribute('aria-label'))?.split(', ')[0];
    expect(name).toBeTruthy();

    await marker.click();
    const card = page.locator('[data-selected="true"]').filter({ hasText: name as string });
    await expect(card.first()).toBeVisible();
  });

  test('basemap tiles load, and OSM attribution is present as the licence requires', async ({ page }) => {
    await page.goto('/search?q=Vijayawada');
    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('OpenStreetMap');
  });

  test('bare /search works with no query, filters, or location', async ({ page }) => {
    // Regression: the page defaulted to `sort=distance`, which the api rejects
    // without an origin, so opening Explore from the nav produced a
    // VALIDATION_FAILED error screen instead of results.
    await page.goto('/search');
    await expect(page.locator('.pk-marker').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/lots found/i).first()).toBeVisible();
    await expect(page.getByText(/connection lost/i)).toHaveCount(0);
  });

  test('Kurnool is covered by name, not just by city', async ({ page }) => {
    await page.goto('/search?q=Kurnool');
    await expect(page.locator('.pk-marker').first()).toBeVisible({ timeout: 45_000 });

    for (const name of ['Anand Cinema Complex', 'SVC Complex', 'Raj Vihar Centre']) {
      await expect(page.getByRole('link', { name }).first()).toBeVisible();
    }
  });

  test('mobile shows the draggable sheet instead of the desktop split', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/search?q=Kurnool');

    const sheet = page.getByRole('region', { name: /parking results/i });
    await expect(sheet).toBeVisible({ timeout: 45_000 });

    // No horizontal overflow at the narrowest supported width.
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflows).toBe(false);
  });
});
