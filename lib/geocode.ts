export interface GeocodeSuggestion {
  name: string;
  fullName: string;
  lat: number;
  lng: number;
}

export async function searchLocation(query: string): Promise<GeocodeSuggestion[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Geocode error: ${res.status}`);
  return res.json();
}
