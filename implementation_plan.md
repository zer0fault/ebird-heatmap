# eBird Heatmap — Implementation Plan

## Project Overview

An interactive, locally-run web application that visualizes eBird observation data as heatmaps.
Built with Next.js + TypeScript, it proxies the eBird API server-side so the API key is never
exposed to the browser. Anyone who clones the repo brings their own key via `.env.local`.

**Three visualization modes:**
1. **Biodiversity** — unique species count per location (richest areas glow brightest)
2. **Species-specific** — where a searched species has been seen recently
3. **Notable/rare sightings** — rare or unusual species reported in the area

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router) | API routes handle key proxying; no separate backend needed |
| Language | TypeScript | Type safety for eBird response shapes and map handlers |
| Mapping | MapLibre GL JS via `react-map-gl` | Open-source Mapbox fork — WebGL heatmap, no account or credit card required |
| Basemap | CartoDB DarkMatter | Free raster tiles, no account required, dark style ideal for heatmaps |
| Styling | Tailwind CSS | Fast utility-based UI |
| Caching | IndexedDB via `idb` | Persist API responses between sessions, no server needed |
| API | eBird API 2.0 | Observation data, taxonomy, hotspots |
| Dev server | `next dev` | No separate processes to manage |

---

## Architecture

```
ebird-heatmap/
├── .env.local                        # EBIRD_API_KEY=... (gitignored)
├── .env.example                      # Template for cloners (committed)
├── local-types/                      # TS workaround: react-map-gl pulls in a
│   └── mapbox__point-geometry/       # broken @types stub — this shims it
│       └── index.d.ts
├── app/
│   ├── page.tsx                      # Main map page
│   ├── layout.tsx                    # Root layout
│   └── api/
│       ├── observations/route.ts     # GET /v2/data/obs/geo/recent
│       ├── species/route.ts          # GET /v2/data/obs/geo/recent/{speciesCode}
│       ├── notable/route.ts          # GET /v2/data/obs/geo/recent/notable
│       ├── hotspots/route.ts         # GET /v2/ref/hotspot/geo
│       └── taxonomy/route.ts         # GET /v2/ref/taxonomy/ebird (species search)
├── components/
│   ├── Map.tsx                       # MapLibre GL canvas wrapper
│   ├── HeatmapLayer.tsx              # MapLibre heatmap layer logic
│   ├── NotableMarkersLayer.tsx       # Marker pins for rare sightings
│   ├── ControlPanel.tsx              # Mode selector, filters, species search
│   └── Legend.tsx                    # Color scale legend
├── lib/
│   ├── ebird.ts                      # Typed fetch functions for each API route
│   ├── cache.ts                      # IndexedDB read/write helpers (idb)
│   ├── geo.ts                        # Geolocation helpers
│   └── types.ts                      # eBird response types (Observation, Hotspot, etc.)
└── public/
```

---

## eBird API Endpoints Used

| Next.js Route | eBird Endpoint | Used For |
|---|---|---|
| `/api/observations` | `GET /v2/data/obs/geo/recent` | Biodiversity mode — all species near coords |
| `/api/species` | `GET /v2/data/obs/geo/recent/{speciesCode}` | Species-specific mode |
| `/api/notable` | `GET /v2/data/obs/geo/recent/notable` | Notable/rare mode |
| `/api/hotspots` | `GET /v2/ref/hotspot/geo` | Hotspot overlay |
| `/api/taxonomy` | `GET /v2/ref/taxonomy/ebird` | Species search autocomplete |

**Key API constraints:**
- Lookback window: 1–30 days (default 14, configurable)
- Max results per request: 10,000
- Coordinates required for geo endpoints (`lat`, `lng`, `dist` in km)
- Auth: `x-ebirdapitoken` header (injected server-side from `process.env.EBIRD_API_KEY`)

---

## Milestones

### M1 — Project Scaffold ✅
**Goal:** App runs locally, map renders centered on user's location.

- [x] Scaffold Next.js app with TypeScript + Tailwind
- [x] Install dependencies: `maplibre-gl react-map-gl idb`
- [x] Add `.env.local` with `EBIRD_API_KEY` (gitignored)
- [x] Add `.env.example` with placeholder values and setup instructions
- [x] Build `Map.tsx` — MapLibre GL + CartoDB DarkMatter basemap, full viewport
- [x] Implement browser geolocation in `lib/geo.ts` with US center fallback
- [x] Map auto-centers on user's detected location on load
- [x] Fix `mapbox__point-geometry` TS stub via `local-types/` shim
- [x] **Checkpoint:** `next dev` shows a full-screen dark map centered on your location

---

### M2 — eBird API Integration
**Goal:** App fetches real observation data through secure server-side routes.

- [ ] Build `lib/types.ts` — TypeScript interfaces for `Observation`, `Hotspot`, `TaxonomyEntry`
- [ ] Build Next.js API route `/api/observations` — accepts `lat`, `lng`, `dist`, `back` params
- [ ] Build Next.js API route `/api/notable` — same params
- [ ] Build Next.js API route `/api/taxonomy` — accepts `q` (query string) for species search
- [ ] Build `lib/ebird.ts` — typed client functions that call the Next.js routes (not eBird directly)
- [ ] Add basic error handling: missing key, API errors, network failures
- [ ] **Checkpoint:** `fetch('/api/observations?lat=...&lng=...&dist=50')` returns typed JSON in browser devtools

---

### M3 — Biodiversity Heatmap
**Goal:** Observations render as a heatmap where intensity = unique species count per location.

- [ ] Build `HeatmapLayer.tsx` — MapLibre GL JS `heatmap` layer type
- [ ] Aggregate observations client-side: group by `locID`, count unique `comName` per location
- [ ] Map species count → heatmap weight value (normalized 0–1)
- [ ] Define color ramp: low density (blue) → medium (yellow) → high (red)
- [ ] Build `Legend.tsx` — gradient bar with low/high labels
- [ ] Add loading skeleton while observations are fetching
- [ ] **Checkpoint:** Biodiversity heatmap renders on the map with correct intensity and legend

---

### M4 — Species-Specific Mode
**Goal:** User searches for a species and sees where it's been spotted recently.

- [ ] Build Next.js API route `/api/species` — accepts `speciesCode`, `lat`, `lng`, `dist`, `back`
- [ ] Build `/api/taxonomy` route — search eBird taxonomy by common/scientific name
- [ ] Add species search input to `ControlPanel.tsx` with debounced autocomplete
- [ ] On species select: fetch `/api/species`, replace heatmap data
- [ ] Heatmap intensity = `howMany` (individual bird count) for that species
- [ ] Display selected species name and result count in UI
- [ ] **Checkpoint:** Searching "Barn Swallow" updates the heatmap to show only those sightings

---

### M5 — Notable/Rare Sightings Mode
**Goal:** Rare sightings appear as individual markers (not a heatmap) with species info.

- [ ] Build Next.js API route `/api/notable`
- [ ] Build `NotableMarkersLayer.tsx` — MapLibre GL JS `symbol` or `circle` layer
- [ ] Marker popup on click: species name, observation date, location name, count
- [ ] Color-code markers (e.g. yellow = locally rare, red = nationally rare)
- [ ] Cluster markers at low zoom levels
- [ ] **Checkpoint:** Notable mode shows clickable pins with observation details

---

### M6 — Mode Switcher + Filters
**Goal:** User can switch between the three modes and adjust query parameters.

- [ ] Build `ControlPanel.tsx` with mode toggle (Biodiversity / Species / Notable)
- [ ] Add date range slider: "last N days" (1–30, default 14)
- [ ] Add radius slider: search distance in km (10–200km)
- [ ] Switching mode or adjusting filters triggers a re-fetch
- [ ] Active mode reflected in legend and panel state
- [ ] **Checkpoint:** All three modes switchable, filters update the heatmap live

---

### M7 — IndexedDB Caching
**Goal:** Repeat queries don't re-hit the eBird API; cache auto-expires after 24 hours.

- [ ] Build `lib/cache.ts` using `idb` — `get(key)`, `set(key, data, ttl)`, `clear()`
- [ ] Cache key format: `ebird:{mode}:{lat}:{lng}:{dist}:{back}`
- [ ] On fetch: check cache first, only call API on miss or expired entry
- [ ] Add small cache-status indicator in UI ("From cache · 3h ago" / "Live")
- [ ] Add "Refresh" button that bypasses cache
- [ ] **Checkpoint:** Reloading the page with same filters loads instantly from IndexedDB

---

### M8 — Polish & Docs
**Goal:** App is clean, usable, and easy to set up from a fresh clone.

- [ ] Write `README.md`:
  - Prerequisites (Node.js, eBird API key)
  - Setup steps: clone → copy `.env.example` → `npm install` → `next dev`
  - Link to get eBird API key
- [ ] Add error state UI: "No observations found in this area"
- [ ] Add empty state when species search returns no results
- [ ] Mobile-responsive layout (collapsible control panel)
- [ ] Keyboard shortcut: `Escape` closes popups/panel
- [ ] **Checkpoint:** A fresh clone with only `.env.local` populated runs end-to-end

---

## Environment Variables

```bash
# .env.local (never committed)
EBIRD_API_KEY=your_ebird_key_here

# .env.example (committed — template for cloners)
EBIRD_API_KEY=
```

**How to get your eBird API key:** https://ebird.org/api/keygen (free, requires eBird account)

---

## Data Flow

```
User loads app
  └─> browser geolocation API → lat/lng
      └─> check IndexedDB cache
          ├─> HIT: render cached data immediately
          └─> MISS: fetch /api/observations (Next.js route)
                └─> server injects EBIRD_API_KEY header
                    └─> eBird API returns observations[]
                        └─> store in IndexedDB with 24hr TTL
                            └─> aggregate + render heatmap layer
```

---

## Key Decisions & Rationale

| Decision | Rationale |
|---|---|
| Next.js API routes (not separate backend) | Zero extra infra; key stays server-side; anyone who clones runs `next dev` and it works |
| MapLibre GL JS over Mapbox GL JS | Identical API, fully open-source, no account or credit card required |
| CartoDB DarkMatter basemap | Free raster tiles, no account needed, dark style provides ideal contrast for heatmap overlays |
| IndexedDB over `localStorage` | 100MB+ capacity vs 5MB limit; handles thousands of observation objects comfortably |
| Notable mode as markers, not heatmap | Rare sightings are sparse by definition; individual clickable pins are more useful than a diffuse heatmap |
| Client-side species count aggregation | eBird returns individual observations, not pre-aggregated counts; grouping by `locID` is fast enough client-side for 10k records |
