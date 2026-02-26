export interface Coords {
  lat: number;
  lng: number;
}

// Geographic center of the contiguous US — used when geolocation is unavailable
const FALLBACK: Coords = { lat: 39.8283, lng: -98.5795 };

/**
 * Returns the user's current coordinates via the browser Geolocation API.
 * Falls back to the center of the US if permission is denied or unavailable.
 */
export function getUserLocation(): Promise<Coords> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(FALLBACK);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(FALLBACK),
      { timeout: 8000, maximumAge: 60_000 }
    );
  });
}
