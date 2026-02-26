import { NextRequest, NextResponse } from 'next/server';
import type { Observation } from '@/lib/types';
import { parseGeoParams, eBirdFetch } from '@/app/api/_lib';

export async function GET(req: NextRequest) {
  const params = parseGeoParams(req.nextUrl.searchParams);
  if (!params.ok) return params.response;

  const result = await eBirdFetch<Observation[]>('/data/obs/geo/recent/notable', {
    lat: params.lat,
    lng: params.lng,
    dist: params.dist,
    back: params.back,
    maxResults: params.maxResults,
    detail: 'full',
  });
  if (!result.ok) return result.response;

  return NextResponse.json(result.data);
}
