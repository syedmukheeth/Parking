'use client';

import type { LocationSummary } from '@parkap/shared';
import { availabilityStatus, type AvailabilityStatus } from '@/lib/availability';

/**
 * Marker styling per availability band. Solid fills rather than outlines —
 * a marker has to be readable at a glance over busy map tiles.
 *
 * These are inline style values, not Tailwind classes: MapLibre mounts marker
 * elements outside the React tree used for class extraction in some paths, so
 * reading straight off the CSS custom properties is the reliable route. The
 * properties are the same semantic tokens the rest of the app uses, so the
 * marker still changes with the theme.
 */
const MARKER_VAR: Record<AvailabilityStatus, { bg: string; fg: string }> = {
  available: { bg: 'var(--available)', fg: 'var(--available-foreground)' },
  limited: { bg: 'var(--limited)', fg: 'var(--limited-foreground)' },
  full: { bg: 'var(--full)', fg: 'var(--full-foreground)' },
};

export interface MarkerRenderOptions {
  location: LocationSummary;
  available: number;
  total: number;
  isSelected: boolean;
  label: { full: string; free: string };
}

/**
 * Builds the marker's DOM directly. MapLibre needs a real element to anchor,
 * and mounting a React root per marker for a label and a count is a lot of
 * machinery for a div — this keeps 35 markers cheap to create and update.
 *
 * Returns a button, not a div: markers are interactive, so they must be
 * focusable and operable from the keyboard. A div with a click handler is the
 * single most common accessibility failure in map UIs.
 */
export function createMarkerElement(options: MarkerRenderOptions): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'pk-marker';
  updateMarkerElement(el, options);
  return el;
}

export function updateMarkerElement(el: HTMLButtonElement, options: MarkerRenderOptions): void {
  const { location, available, total, isSelected, label } = options;
  const status = availabilityStatus(available, total);
  const colors = MARKER_VAR[status];
  const text = status === 'full' ? label.full : String(available);

  el.dataset.status = status;
  el.dataset.selected = String(isSelected);
  el.style.setProperty('--marker-bg', colors.bg);
  el.style.setProperty('--marker-fg', colors.fg);

  // The count IS the label — colour alone would exclude anyone who can't
  // separate the green from the red.
  el.textContent = text;

  const summary = status === 'full' ? label.full : `${available} ${label.free}`;
  el.setAttribute('aria-label', `${location.name} — ${summary}`);
  el.setAttribute('aria-pressed', String(isSelected));
  el.title = `${location.name} · ${summary}`;
}
