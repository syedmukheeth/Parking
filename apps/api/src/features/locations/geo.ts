/**
 * Pure geo math - framework-free, unit-tested in isolation. Bounding box is a
 * cheap SQL-indexable prefilter; Haversine in JS does the exact circle cut.
 * PostGIS is a deliberate later upgrade once volume justifies it
 * (docs/DATA-MODEL.md) - not something to adopt at seed scale.
 */

const EARTH_RADIUS_KM = 6371;
const AVG_WALKING_KMPH = 4.8;
const KM_PER_DEGREE_LAT = 111;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function walkingMinutes(km: number): number {
  return Math.max(1, Math.round((km / AVG_WALKING_KMPH) * 60));
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Degrees-per-km approximation. Overshoots slightly - that overshoot is what
 * makes it a safe SQL prefilter for the exact Haversine cut that follows. */
export function boundingBox(lat: number, lng: number, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const lngDelta = radiusKm / (KM_PER_DEGREE_LAT * Math.cos(toRad(lat)) || 1);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
