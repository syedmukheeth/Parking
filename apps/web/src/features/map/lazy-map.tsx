'use client';

import dynamic from 'next/dynamic';
import { t } from '@/i18n/messages';
import type { MapViewProps } from './map-view';

/**
 * MapLibre plus its stylesheet is a large dependency, and most of the product
 * (bookings, profile, the ticket) never shows a map. Loading it on demand
 * keeps it out of the initial bundle for those routes.
 *
 * `ssr: false` is required, not a preference — MapLibre touches `window` at
 * module scope and throws during a server render.
 */
export const LazyMap = dynamic<MapViewProps>(() => import('./map-view').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label={t('map.loading')}
      className="h-full w-full animate-pulse bg-secondary motion-reduce:animate-none"
    />
  ),
});
