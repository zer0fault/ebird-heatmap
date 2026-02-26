import { NextRequest, NextResponse } from 'next/server';
import type { Observation } from '@/lib/types';

const EBIRD_BASE = 'https://api.ebird.org/v2';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const dist = searchParams.get('dist') ?? '25';
  const back = searchParams.get('back') ?? '14';
  const maxResults = searchParams.get('maxResults') ?? '1000';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'EBIRD_API_KEY is not configured' }, { status: 500 });
  }

  const url = new URL(`${EBIRD_BASE}/data/obs/geo/recent/notable`);
  url.searchParams.set('lat', lat);
  url.searchParams.set('lng', lng);
  url.searchParams.set('dist', dist);
  url.searchParams.set('back', back);
  url.searchParams.set('maxResults', maxResults);
  url.searchParams.set('detail', 'full');

  const res = await fetch(url.toString(), {
    headers: { 'x-ebirdapitoken': apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `eBird API error: ${res.status} ${res.statusText}` },
      { status: res.status }
    );
  }

  const data: Observation[] = await res.json();
  return NextResponse.json(data);
}
