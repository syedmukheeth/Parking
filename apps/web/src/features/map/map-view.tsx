'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
} from 'maplibre-gl';
import type { LocationSummary } from '@parkap/shared';
import { t } from '@/i18n/messages';
import { AP_BOUNDS, AP_CENTER, AP_DEFAULT_ZOOM, buildMapStyle, LOCATION_ZOOM, MAX_LIVE_MARKERS } from './map-config';
import { createMarkerElement, updateMarkerElement } from './parking-marker';
import { useLiveAvailability } from './use-live-availability';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface MapViewProps {
  locations: LocationSummary[];
  selectedId?: string | null;
  onSelect?: (locationId: string) => void;
  /** Citizen's own position, when they've granted permission. */
  userPosition?: { lat: number; lng: number } | null;
  /** Refit the camera to the results whenever they change. Off on the detail
   * page, where the camera is pinned to one lot. */
  fitToLocations?: boolean;
  className?: string;
}

/**
 * The map.
 *
 * Markers are managed imperatively against a keyed map rather than re-created
 * on every render — recreating 35 DOM nodes each time availability ticks would
 * make the whole surface flicker and drop any in-progress hover.
 *
 * Availability shown here is advisory, exactly like the list badges. The
 * transactional capacity check is what decides a booking (CLAUDE.md).
 */
export function MapView({
  locations,
  selectedId,
  onSelect,
  userPosition,
  fitToLocations = true,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const userMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Only the first N locations hold a live subscription — see MAX_LIVE_MARKERS.
  const liveIds = useMemo(
    () => locations.slice(0, MAX_LIVE_MARKERS).map((location) => location.id),
    [locations],
  );
  const liveCounts = useLiveAvailability(liveIds);

  const labels = useMemo(() => ({ full: t('availability.full'), free: t('availability.free') }), []);

  // ── Map lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: buildMapStyle(window.devicePixelRatio),
      center: AP_CENTER,
      zoom: AP_DEFAULT_ZOOM,
      maxBounds: AP_BOUNDS,
      attributionControl: { compact: true },
    });

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    // Honour the OS setting — MapLibre's fly animations are not covered by the
    // CSS reduced-motion block, they run on the GPU.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      map.scrollZoom.setWheelZoomRate(1);
    }

    mapRef.current = map;

    // Captured now rather than read at teardown. The ref holds one stable Map
    // instance for the component's life, so this is the same object either way
    // — but reading `.current` inside a cleanup is the pattern that silently
    // breaks when a ref is later reassigned, which is what the lint rule is
    // guarding against.
    const markers = markersRef.current;

    return () => {
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Markers ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    for (const location of locations) {
      seen.add(location.id);
      const live = liveCounts[location.id];
      const options = {
        location,
        available: live?.available ?? location.availability.available,
        total: live?.total ?? location.availability.total,
        isSelected: location.id === selectedId,
        label: labels,
      };

      const existing = markersRef.current.get(location.id);
      if (existing) {
        updateMarkerElement(existing.el, options);
        existing.marker.setLngLat([location.lng, location.lat]);
        continue;
      }

      const el = createMarkerElement(options);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectRef.current?.(location.id);
      });

      const marker = new Marker({ element: el }).setLngLat([location.lng, location.lat]).addTo(map);
      markersRef.current.set(location.id, { marker, el });
    }

    // Drop markers for locations that fell out of the result set.
    for (const [id, { marker }] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [locations, liveCounts, selectedId, labels]);

  // ── Camera: fit to results ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitToLocations || locations.length === 0) return;

    const bounds = new LngLatBounds();
    for (const location of locations) bounds.extend([location.lng, location.lat]);

    map.fitBounds(bounds, {
      padding: { top: 64, bottom: 64, left: 64, right: 64 },
      maxZoom: LOCATION_ZOOM - 1,
      duration: prefersReducedMotion() ? 0 : 700,
    });
  }, [locations, fitToLocations]);

  // ── Camera: fly to selection ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const target = locations.find((location) => location.id === selectedId);
    if (!target) return;

    map.flyTo({
      center: [target.lng, target.lat],
      zoom: Math.max(map.getZoom(), LOCATION_ZOOM),
      duration: prefersReducedMotion() ? 0 : 800,
      essential: true,
    });
  }, [selectedId, locations]);

  // ── User position ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!userPosition) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    const existing = userMarkerRef.current;
    if (existing) {
      existing.setLngLat([userPosition.lng, userPosition.lat]);
      return;
    }

    const el = document.createElement('div');
    el.className = 'pk-user-dot';
    el.setAttribute('aria-hidden', 'true');
    userMarkerRef.current = new Marker({ element: el })
      .setLngLat([userPosition.lng, userPosition.lat])
      .addTo(map);
  }, [userPosition]);

  return (
    <div
      ref={containerRef}
      className={className}
      // The map is a visual aid; every lot on it is also in the adjacent list,
      // which is the keyboard- and screen-reader-accessible path. Markers are
      // still real buttons, so they remain individually operable.
      role="application"
      aria-label={t('map.label')}
    />
  );
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
