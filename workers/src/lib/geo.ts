// Coarse location handling for "people near you" suggestions.
//
// Locations are reduced to a geohash cell and only ever stored at that
// resolution. We never keep the raw coordinates a browser reports, so the most
// precise answer this system can give about anyone is "somewhere in a cell tens
// of kilometres across".

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Cell size by geohash length, for picking a precision deliberately. */
export const GEOHASH_PRECISION = {
  /** ~630km cell - country/region scale. */
  REGION: 3,
  /** ~40km cell - metro scale. This is what we store. */
  METRO: 4,
} as const;

/**
 * Encodes a latitude/longitude as a geohash of the given length.
 * Standard algorithm: interleave bits that successively bisect the longitude
 * and latitude ranges, then read them off five at a time in base32.
 */
export function encodeGeohash(lat: number, lon: number, precision: number = GEOHASH_PRECISION.METRO): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Invalid coordinates');
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('Coordinates out of range');
  }

  let latRange = [-90, 90];
  let lonRange = [-180, 180];
  let hash = '';
  let bits = 0;
  let bitCount = 0;
  let useLon = true;

  while (hash.length < precision) {
    if (useLon) {
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (lon >= mid) {
        bits = (bits << 1) | 1;
        lonRange = [mid, lonRange[1]];
      } else {
        bits = bits << 1;
        lonRange = [lonRange[0], mid];
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat >= mid) {
        bits = (bits << 1) | 1;
        latRange = [mid, latRange[1]];
      } else {
        bits = bits << 1;
        latRange = [latRange[0], mid];
      }
    }

    useLon = !useLon;
    bitCount += 1;

    if (bitCount === 5) {
      hash += BASE32[bits];
      bits = 0;
      bitCount = 0;
    }
  }

  return hash;
}

/**
 * True if two geohashes fall in the same cell at the given precision.
 * Comparing prefixes is how we widen the net without ever computing an actual
 * distance between two people.
 */
export function sameCell(a: string, b: string, precision: number): boolean {
  if (!a || !b) return false;
  return a.slice(0, precision) === b.slice(0, precision);
}
