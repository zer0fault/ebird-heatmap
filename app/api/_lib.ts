// Shared server-side utilities for eBird API proxy routes.
// `server-only` makes any accidental client-side import a hard build error.
import 'server-only';

import { NextResponse } from 'next/server';

const EBIRD_BASE = 'https://api.ebird.org/v2';

// Discriminated union returned by parseGeoParams — lets routes early-return
// the error response without any additional null checks.
export type GeoParamsResult =
  | { ok: true; lat: string; lng: string; dist: string; back: string; maxResults: string }
  | { ok: false; response: NextResponse };

/** Validate and parse geo query params, returning typed values or an error response. */
export function parseGeoParams(searchParams: URLSearchParams): GeoParamsResult {
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const distStr = searchParams.get('dist') ?? '25';
  const backStr = searchParams.get('back') ?? '14';
  const maxResultsStr = searchParams.get('maxResults') ?? '1000';

  if (!latStr || !lngStr) {
    return { ok: false, response: NextResponse.json({ error: 'lat and lng are required' }, { status: 400 }) };
  }

  const lat = Number(latStr);
  const lng = Number(lngStr);
  const dist = Number(distStr);
  const back = Number(backStr);
  const maxResults = Number(maxResultsStr);

  if (isNaN(lat) || lat < -90 || lat > 90)
    return { ok: false, response: NextResponse.json({ error: 'lat must be between -90 and 90' }, { status: 400 }) };
  if (isNaN(lng) || lng < -180 || lng > 180)
    return { ok: false, response: NextResponse.json({ error: 'lng must be between -180 and 180' }, { status: 400 }) };
  if (isNaN(dist) || dist < 1 || dist > 50)
    return { ok: false, response: NextResponse.json({ error: 'dist must be between 1 and 50' }, { status: 400 }) };
  if (isNaN(back) || back < 1 || back > 30)
    return { ok: false, response: NextResponse.json({ error: 'back must be between 1 and 30' }, { status: 400 }) };
  if (isNaN(maxResults) || maxResults < 1 || maxResults > 10000)
    return { ok: false, response: NextResponse.json({ error: 'maxResults must be between 1 and 10000' }, { status: 400 }) };

  return { ok: true, lat: String(lat), lng: String(lng), dist: String(dist), back: String(back), maxResults: String(maxResults) };
}

// Discriminated union returned by eBirdFetch.
type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Fetch from the eBird API, injecting the API key server-side.
 * Returns typed data on success, or an error NextResponse on failure.
 *
 * @param path      eBird API path, e.g. "/data/obs/geo/recent"
 * @param params    Query params to append
 * @param revalidate Next.js cache revalidation in seconds (0 = no cache)
 */
export async function eBirdFetch<T>(
  path: string,
  params: Record<string, string>,
  revalidate = 0
): Promise<FetchResult<T>> {
  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey) {
    return { ok: false, response: NextResponse.json({ error: 'EBIRD_API_KEY is not configured' }, { status: 500 }) };
  }

  const url = new URL(`${EBIRD_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'x-ebirdapitoken': apiKey },
    next: { revalidate },
  });

  if (!res.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `eBird API error: ${res.status} ${res.statusText}` },
        { status: res.status }
      ),
    };
  }

  const data = (await res.json()) as T;
  return { ok: true, data };
}
