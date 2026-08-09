import { expect, test } from '@playwright/test';

/**
 * The full acceptance run from docs/ROADMAP.md: search Tirupati → open a lot →
 * reserve → mock pay → pass issued → history shows it.
 *
 * Deterministic because the payment is mocked and DEMO_AUTO_SIGN_IN provides a
 * fixed seeded citizen, so there is no sign-in step and no OTP rate limit to
 * trip over. Requires the full stack running locally.
 */
test.describe('booking journey', () => {
  // The booking path crosses web → api → worker (the pass is issued by a
  // background job), so it needs more room than a single-page test.
  test.describe.configure({ timeout: 120_000 });

  test('search, reserve, pay, and see the parking pass', async ({ page }) => {
    await page.goto('/search?q=Tirupati');
    await page.getByRole('link', { name: /Tirumala/i }).first().click();

    // The demo citizen has saved vehicles, so the picker is shown and its
    // default is pre-selected. Booking straight from it is the path the saved
    // vehicles exist for.
    const picker = page.locator('#savedVehicle');
    await expect(picker).toBeVisible({ timeout: 60_000 });
    const plate = (await picker.locator('option:checked').textContent())?.split(' ·')[0]?.trim();
    expect(plate).toBeTruthy();

    const now = new Date();
    await page.locator('#startAt').fill(toLocalInputValue(new Date(now.getTime() + 5 * 60_000)));
    await page.locator('#endAt').fill(toLocalInputValue(new Date(now.getTime() + 65 * 60_000)));

    await page.getByRole('button', { name: /get a quote/i }).click();
    await page.getByRole('button', { name: /confirm reservation/i }).click();
    await page.getByRole('button', { name: /pay now/i }).click();

    const passLink = page.getByRole('link', { name: /view parking pass/i });
    await expect(passLink).toBeVisible({ timeout: 45_000 });
    await passLink.click();

    // The QR is issued asynchronously by apps/worker, so the component polls.
    // This assertion is what proves the whole web → api → queue → worker →
    // ticket chain actually completed, not just that the booking row exists.
    await expect(page.getByRole('img', { name: /entry qr code/i })).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText(/show this at the gate/i)).toBeVisible();
    await expect(page.getByText(plate as string).first()).toBeVisible();

    await page.goto('/bookings');
    await expect(page.getByText(plate as string).first()).toBeVisible();
  });

  test('the reservation stepper reports progress', async ({ page }) => {
    await page.goto('/locations/loc_tirumala_main');
    await expect(page.getByRole('list', { name: /booking progress/i })).toBeVisible({ timeout: 40_000 });
    await expect(page.locator('[aria-current="step"]')).toHaveText(/details/i);
  });

  test('the app opens straight into the dashboard with no sign-in', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /where are you parking/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^sign in$/i })).toHaveCount(0);
  });
});

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
