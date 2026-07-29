import { expect, test } from '@playwright/test';

/**
 * The full acceptance run from docs/ROADMAP.md: sign in (stub OTP) → search
 * Tirupati → open a lot → book → mock pay → QR issued → history shows it.
 * Deterministic because both the OTP and payment are stubbed/mocked — no
 * external accounts needed. Requires the full stack running locally; not
 * executed in this environment.
 */
test('search Tirupati, book, pay, and see it in history', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel(/phone number/i).fill('+919876543210');
  await page.getByRole('button', { name: /send code/i }).click();

  await page.getByLabel(/6-digit code/i).fill('123456');
  await page.getByRole('button', { name: /verify/i }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/search?q=Tirupati');
  await page.getByRole('link', { name: /Tirumala/i }).first().click();

  await page.getByLabel(/vehicle number/i).fill('AP39AB1234');
  const now = new Date();
  const start = new Date(now.getTime() + 5 * 60_000);
  const end = new Date(now.getTime() + 65 * 60_000);
  await page.locator('#startAt').fill(toLocalInputValue(start));
  await page.locator('#endAt').fill(toLocalInputValue(end));

  await page.getByRole('button', { name: /get a quote/i }).click();
  await page.getByRole('button', { name: /confirm reservation/i }).click();
  await page.getByRole('button', { name: /pay now/i }).click();

  await expect(page.getByRole('link', { name: /view ticket/i })).toBeVisible();
  await page.getByRole('link', { name: /view ticket/i }).click();
  await expect(page.getByText(/show this qr code/i)).toBeVisible();

  await page.goto('/bookings');
  await expect(page.getByText('AP39AB1234')).toBeVisible();
});

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
