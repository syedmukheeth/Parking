/**
 * Wall-clock schedules ("HH:mm") have no timezone of their own — they are read
 * as Andhra Pradesh local time (IST, UTC+5:30), the only timezone this service
 * operates in. The server clock (UTC) is authoritative; this only converts it
 * for comparison against the schedule strings.
 */
const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MINUTES_PER_DAY = 24 * 60;

export function nowHHmmIST(date: Date = new Date()): string {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const istMinutes = (utcMinutes + IST_OFFSET_MINUTES) % MINUTES_PER_DAY;
  const hh = Math.floor(istMinutes / 60).toString().padStart(2, '0');
  const mm = (istMinutes % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function isOpenNow(openTime: string, closeTime: string, is24x7: boolean, nowHHmm: string): boolean {
  if (is24x7) return true;
  if (openTime <= closeTime) return nowHHmm >= openTime && nowHHmm <= closeTime;
  // Overnight window, e.g. "22:00"–"06:00".
  return nowHHmm >= openTime || nowHHmm <= closeTime;
}
