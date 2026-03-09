import { NextRequest, NextResponse } from 'next/server';

interface NominatimResult {
  display_name: string;
  name: string;
  lat: string;
  lon: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'q must be at least 2 characters' }, { status: 400 });
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '0');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'eBird-Heatmap/1.0 (local development tool)',
      'Accept-Language': 'en',
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Geocoding service error: ${res.status}` },
      { status: res.status }
    );
  }

  const results: NominatimResult[] = await res.json();

  return NextResponse.json(
    results.map((r) => ({
      name: r.display_name.split(',')[0].trim(),
      fullName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }))
  );
}
