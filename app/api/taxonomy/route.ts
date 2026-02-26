import { NextRequest, NextResponse } from 'next/server';
import type { TaxonomyEntry } from '@/lib/types';

const EBIRD_BASE = 'https://api.ebird.org/v2';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'q must be at least 2 characters' }, { status: 400 });
  }

  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'EBIRD_API_KEY is not configured' }, { status: 500 });
  }

  // Fetch full taxonomy and filter client-side — eBird taxonomy endpoint
  // does not support free-text search, so we filter by comName/sciName here.
  const url = new URL(`${EBIRD_BASE}/ref/taxonomy/ebird`);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('cat', 'species');

  const res = await fetch(url.toString(), {
    headers: { 'x-ebirdapitoken': apiKey },
    // Cache taxonomy for 24 hours — it only changes with annual eBird taxonomy updates
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `eBird API error: ${res.status} ${res.statusText}` },
      { status: res.status }
    );
  }

  const all: TaxonomyEntry[] = await res.json();
  const query = q.toLowerCase();
  const matches = all
    .filter(
      (entry) =>
        entry.comName.toLowerCase().includes(query) ||
        entry.sciName.toLowerCase().includes(query)
    )
    .slice(0, 20);

  return NextResponse.json(matches);
}
