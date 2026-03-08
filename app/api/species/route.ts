import { NextRequest, NextResponse } from 'next/server';
import type { Observation } from '@/lib/types';
import { parseGeoParams, eBirdFetch } from '@/app/api/_lib';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const speciesCode = searchParams.get('speciesCode');
  if (!speciesCode) {
    return NextResponse.json({ error: 'speciesCode is required' }, { status: 400 });
  }

  const params = parseGeoParams(searchParams);
  if (!params.ok) return params.response;

  const result = await eBirdFetch<Observation[]>(`/data/obs/geo/recent/${encodeURIComponent(speciesCode)}`, {
    lat: params.lat,
    lng: params.lng,
    dist: params.dist,
    back: params.back,
    maxResults: params.maxResults,
  });
  if (!result.ok) return result.response;

  return NextResponse.json(result.data);
}
