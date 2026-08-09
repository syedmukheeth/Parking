import { Building2, Car, Landmark, TrainFront, Waves } from 'lucide-react';
import type { LocationTag } from '@parkap/shared';

/**
 * Cover art for a parking location.
 *
 * Deliberately generated, not photographic. Every seeded lot is a real place in
 * Andhra Pradesh, and attaching stock imagery to a real address is a claim the
 * data doesn't support — it would survive into a stakeholder demo as though
 * someone had photographed the site. This renders a deterministic gradient
 * instead: same location, same art, every render and every machine.
 *
 * When an operator uploads real photos, they replace this component's output at
 * the same call sites; nothing else changes.
 */

/** FNV-1a. Small, deterministic, and stable across machines — `Math.random`
 * or a date-seeded value would make the art flicker between renders. */
function hashId(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** The glyph hints at what kind of place this is, read off the amenity tags
 * the operator already set. */
function pickIcon(tags: readonly LocationTag[], name: string) {
  const haystack = name.toLowerCase();
  if (tags.includes('temple_shuttle')) return Landmark;
  if (haystack.includes('beach') || haystack.includes('ghat')) return Waves;
  if (haystack.includes('station') || haystack.includes('junction') || haystack.includes('railway')) {
    return TrainFront;
  }
  if (haystack.includes('mall') || haystack.includes('market') || haystack.includes('complex')) {
    return Building2;
  }
  return Car;
}

export function LocationCover({
  locationId,
  name,
  tags,
  className = '',
}: {
  locationId: string;
  name: string;
  tags: readonly LocationTag[];
  className?: string;
}) {
  const hash = hashId(locationId);
  // Narrow band around the brand hue — the art should read as one family, not
  // a rainbow of unrelated cards.
  const hue = 220 + (hash % 60);
  const secondHue = hue + 24;
  const Icon = pickIcon(tags, name);

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden rounded-lg ${className}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.42 0.14 ${hue}) 0%, oklch(0.30 0.10 ${secondHue}) 100%)`,
      }}
    >
      <Icon size={44} strokeWidth={1.4} className="text-white/80" />
    </div>
  );
}
