/**
 * The api returns paise (Int) and UTC ISO strings. Money math never happens
 * in the browser - only display formatting, here, at the edge
 * (parkap-frontend skill).
 */
/**
 * Whole rupees render without decimals - parking tariffs are round numbers and
 * "₹20.00/hr" reads like a bank statement. Paise still show when they exist,
 * which they do on GST-inclusive totals.
 */
export function formatINR(paise: number): string {
  const hasPaise = paise % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatLocalTime(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function formatDistance(km: number | undefined): string | null {
  if (km === undefined) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
