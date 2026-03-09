# eBird Heatmap

An interactive bird observation heatmap built with Next.js and MapLibre GL JS, powered by the [eBird API](https://documenter.getpostman.com/view/664302/S1ENwy59).

Search any location in the world and visualize recent bird activity across three modes: biodiversity hotspots, individual species distribution, and notable/rare sightings.

---

## Features

- **Biodiversity mode** — heatmap weighted by unique species count per location
- **Species mode** — search any species and map its individual sighting density
- **Notable mode** — clustered markers for rare and reviewed sightings with popup details
- **Location search** — find any place worldwide via OpenStreetMap geocoding
- **Filters** — adjustable radius (10–50 km) and lookback window (1–30 days)
- **Caching** — results stored in IndexedDB for 24 hours; manual refresh available

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- An eBird API key — free from [https://ebird.org/api/keygen](https://ebird.org/api/keygen)

---

## Local Setup

**1. Clone the repo**

```bash
git clone https://github.com/zer0fault/ebird-heatmap.git
cd ebird-heatmap
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment**

Create a `.env.local` file in the project root:

```
EBIRD_API_KEY=your_api_key_here
```

**4. Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| Map | MapLibre GL JS via react-map-gl |
| Basemap | CartoDB Dark Matter |
| Styling | Tailwind CSS v4 |
| Caching | IndexedDB via idb |
| Geocoding | Nominatim (OpenStreetMap) |
| Data | eBird API 2.0 |
