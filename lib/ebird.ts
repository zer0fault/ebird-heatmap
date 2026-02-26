import type { Observation, TaxonomyEntry, GeoQueryParams } from '@/lib/types';

function buildParams(params: GeoQueryParams): URLSearchParams {
  const p = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.dist !== undefined) p.set('dist', String(params.dist));
  if (params.back !== undefined) p.set('back', String(params.back));
  if (params.maxResults !== undefined) p.set('maxResults', String(params.maxResults));
  return p;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Request failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch all recent observations near a coordinate (biodiversity mode). */
export function fetchObservations(params: GeoQueryParams): Promise<Observation[]> {
  return fetchJson<Observation[]>(`/api/observations?${buildParams(params)}`);
}

/** Fetch notable/rare sightings near a coordinate. */
export function fetchNotable(params: GeoQueryParams): Promise<Observation[]> {
  return fetchJson<Observation[]>(`/api/notable?${buildParams(params)}`);
}

/** Search eBird taxonomy by common or scientific name. */
export function searchTaxonomy(q: string): Promise<TaxonomyEntry[]> {
  return fetchJson<TaxonomyEntry[]>(`/api/taxonomy?q=${encodeURIComponent(q)}`);
}
