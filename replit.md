# OSINT Tactical Map

## Overview
A full-stack OSINT and situational awareness map application with real-time data feeds, tactical dark UI, drawing tools, and comprehensive map layer controls.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + React-Leaflet (v4) + Leaflet-Draw
- **Backend**: Node.js + Express (API proxy for external services)
- **No database** - all data comes from external APIs

## Security / Anti-Tracking
- `<meta name="referrer" content="no-referrer">` in index.html prevents referer leaking
- Backend strips `X-Forwarded-For`, `Forwarded`, `Via`, `X-Real-IP` headers from all `/api` requests
- All outbound API calls use a generic Chrome User-Agent string to prevent device fingerprinting

## Key Features
1. **Map Tile Layers**: CartoDB Dark Matter (base), OpenStreetMap, OpenRailwayMap, OpenInfrastructureMap
2. **Aviation Data**: OpenSky Network API - live flight tracking with rotated aircraft icons
3. **Marine Data**: AIS Stream WebSocket (requires API key placeholder)
4. **Hazard Data**: NASA EONET API - wildfires and severe storms
5. **Wikipedia Geo**: MediaWiki geosearch API
6. **Surveillance Cameras**: Overpass API querying OSM surveillance nodes
7. **Drawing Tools**: Leaflet-Draw for polygons, rectangles, circles, polylines, markers with edit/delete
8. **Export**: JPG and PDF export via html2canvas + jsPDF (hides UI during capture)
9. **Locate Me**: GPS geolocation
10. **External Links**: Broadcastify police scanner, NSOPW registry lookup

## File Structure
- `client/src/pages/map-page.tsx` - Main map page with all integrations
- `client/src/components/control-panel.tsx` - Floating layer toggle panel
- `client/src/components/map-layers.tsx` - All data layer components (aviation, hazards, wiki, surveillance, marine)
- `client/src/components/map-controls.tsx` - Floating action buttons (locate, export, scanner, registry)
- `client/src/components/map-draw-tools.tsx` - Leaflet-Draw integration via useMap hook
- `server/routes.ts` - Backend API proxy endpoints with anti-tracking and error handling
- `shared/schema.ts` - TypeScript interfaces and Zod schemas

## API Endpoints
- `GET /api/aviation?south=&west=&north=&east=` - OpenSky proxy
- `GET /api/hazards` - NASA EONET proxy
- `GET /api/wikipedia?lat=&lon=&radius=` - MediaWiki proxy
- `GET /api/surveillance?south=&west=&north=&east=` - Overpass API proxy
- `GET /api/reverse-geocode?lat=&lon=` - Nominatim proxy
- `GET /api/health` - API status health check

## Theme
- Dark tactical aesthetic (near-black backgrounds, cyan/blue accents)
- Dark mode enabled by default via `class="dark"` on html element
- Custom Leaflet popup, draw toolbar, and control styling to match dark theme

## External API Notes
- OpenSky: Public endpoint, rate-limited. Add credentials for higher limits.
- AIS Stream: Requires free API key from aisstream.io
- NASA EONET: No key required
- Overpass/Wikipedia/Nominatim: No key required, respect rate limits
