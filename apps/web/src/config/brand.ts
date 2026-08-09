/**
 * The only place in the app allowed to hold colour literals.
 *
 * Browser chrome — the `theme-color` meta tag and the PWA manifest — is read
 * by the OS before any stylesheet is parsed, so it cannot reference a CSS
 * custom property. These four values are therefore unavoidable hex, and they
 * live here so a palette change updates one file instead of drifting apart
 * across two (which is exactly what happened to the previous teal: globals.css
 * moved and manifest.ts silently didn't).
 *
 * Keep in sync with the ramps in app/globals.css.
 */
export const BRAND_HEX = {
  /** --pk-blue-600, the primary. */
  primaryLight: '#1d4ed8',
  /** --pk-slate-50, the page canvas. */
  backgroundLight: '#f8fafc',
} as const;
