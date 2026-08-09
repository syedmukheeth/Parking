import type { StyleSpecification } from 'maplibre-gl';

/**
 * Map configuration.
 *
 * No API key anywhere, which is why the map ships now instead of waiting on
 * the Google Maps key that ROADMAP lists as blocked.
 *
 * ── Why raster and not vector ──────────────────────────────────────────────
 * The first implementation used OpenFreeMap's `bright` vector style. Its
 * stylesheet, sprites and TileJSON all fetch fine (verified: HTTP 200 each),
 * but *zero* `.pbf` tiles are ever requested, so the map renders its
 * background layer and nothing else. Cause: MapLibre decodes vector tiles in a
 * Web Worker, and that worker starts and immediately dies under the Next
 * bundler, markers and sprites keep working because they live on the main
 * thread, which is what makes the failure look like a styling problem.
 *
 * Raster tiles are decoded as plain images on the main thread, so they sidesteep
 * the worker entirely. Revisit vector once the worker is bundled correctly;
 * the switch is this file only.
 *
 * ── Attribution and usage ─────────────────────────────────────────────────
 * OSM attribution is a licence condition, not a nicety: MapView renders it and
 * it must not be removed. CARTO's basemaps are free for this kind of use with
 * attribution; a production deployment at real traffic should move to its own
 * tile server or a paid plan rather than leaning on their CDN.
 *
 * If a Content-Security-Policy is added later it needs `basemaps.cartocdn.com`
 * in img-src and connect-src, or the basemap silently goes blank.
 */
const RASTER_TILES = [
  'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{ratio}.png',
  'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{ratio}.png',
  'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{ratio}.png',
];

export const OSM_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';

export function buildMapStyle(devicePixelRatio: number): StyleSpecification {
  // Retina tiles on high-DPI screens; the `@2x` suffix is how CARTO serves them.
  const ratio = devicePixelRatio > 1.25 ? '@2x' : '';

  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: RASTER_TILES.map((url) => url.replace('{ratio}', ratio)),
        tileSize: 256,
        maxzoom: 20,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  };
}

/** Andhra Pradesh, roughly centred, the default view before geolocation or a
 * search narrows it. */
export const AP_CENTER: [number, number] = [80.6, 16.2];
export const AP_DEFAULT_ZOOM = 6.4;

/** Zoom used when flying to a single selected lot. Close enough to read the
 * surrounding streets, wide enough to keep a landmark in frame. */
export const LOCATION_ZOOM = 15;

/** Bounds of Andhra Pradesh, used to keep the camera from drifting into the
 * Bay of Bengal when a search returns nothing. */
export const AP_BOUNDS: [[number, number], [number, number]] = [
  [76.5, 12.5],
  [85.0, 19.5],
];

/**
 * How many locations may hold a live socket subscription at once.
 *
 * Every subscribed marker is a room on the realtime gateway. Thirty-five
 * markers on screen would mean thirty-five subscriptions per tab, which is
 * how a realtime feature becomes a load problem. Markers outside this cap
 * render from their server snapshot, which is still accurate at page load:
 * and no marker count authorises a booking regardless (CLAUDE.md).
 */
export const MAX_LIVE_MARKERS = 20;
