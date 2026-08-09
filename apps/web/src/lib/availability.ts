/**
 * The availability triad, in one place.
 *
 * Which band a lot falls into decides its marker colour on the map, its badge
 * in a list, and whether the UI discourages a booking, so the thresholds are
 * deterministic application logic, not a styling detail scattered across
 * components (CLAUDE.md: business logic stays out of presentation).
 *
 * The counts feeding this are advisory. A badge or marker never authorises a
 * booking; the transactional capacity check does.
 */
export type AvailabilityStatus = 'available' | 'limited' | 'full';

/** At or below this share of capacity, a lot reads as "limited". */
export const LIMITED_THRESHOLD = 0.15;

export function availabilityStatus(available: number, total: number): AvailabilityStatus {
  if (available <= 0) return 'full';
  if (total > 0 && available / total <= LIMITED_THRESHOLD) return 'limited';
  return 'available';
}

/** Token classes per band. Colour never travels alone, every caller pairs
 * these with the count or a word, because roughly 8% of male users cannot
 * separate the green and red by hue. */
export const AVAILABILITY_CLASSES: Record<AvailabilityStatus, { solid: string; subtle: string }> = {
  available: {
    solid: 'bg-available text-available-foreground',
    subtle: 'bg-available-subtle text-available-subtle-foreground',
  },
  limited: {
    solid: 'bg-limited text-limited-foreground',
    subtle: 'bg-limited-subtle text-limited-subtle-foreground',
  },
  full: {
    solid: 'bg-full text-full-foreground',
    subtle: 'bg-full-subtle text-full-subtle-foreground',
  },
};
