// eBird API 2.0 response types

export interface Observation {
  speciesCode: string;   // e.g. "barswa"
  comName: string;       // e.g. "Barn Swallow"
  sciName: string;       // e.g. "Hirundo rustica"
  locId: string;         // e.g. "L99381"
  locName: string;       // e.g. "Stewart Park"
  obsDt: string;         // e.g. "2024-06-24 17:00"
  howMany: number;       // individual bird count
  lat: number;
  lng: number;
  obsValid: boolean;
  obsReviewed: boolean;
  locationPrivate: boolean;
  subId: string;         // checklist ID
}

export interface Hotspot {
  locId: string;
  locName: string;
  countryCode: string;
  subnational1Code: string;
  lat: number;
  lng: number;
  latestObsDt?: string;
  numSpeciesAllTime?: number;
}

export interface TaxonomyEntry {
  speciesCode: string;   // e.g. "barswa"
  comName: string;       // e.g. "Barn Swallow"
  sciName: string;       // e.g. "Hirundo rustica"
  category: string;      // e.g. "species", "slash", "hybrid"
  order: string;
  familyComName: string;
  familySciName: string;
}

// Shared query params for geo-based observation endpoints
export interface GeoQueryParams {
  lat: number;
  lng: number;
  dist?: number;   // km radius, 1–50 (default 25)
  back?: number;   // days back, 1–30 (default 14)
  maxResults?: number;
}

export interface ApiError {
  error: string;
  status: number;
}
