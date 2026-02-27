# OSINT Tactical Map

## Overview
A full-stack OSINT and situational awareness map application with real-time data feeds, tactical dark UI, drawing tools, and comprehensive map layer controls.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + React-Leaflet (v4) + Leaflet-Draw
- **Backend**: Node.js + Express (API proxy for external services)
- **Database**: PostgreSQL (Drizzle ORM) for user accounts and sessions
- **Auth**: Replit Auth (OpenID Connect via passport)

## Security / Anti-Tracking
- `<meta name="referrer" content="no-referrer">` in index.html prevents referer leaking
- Backend strips `X-Forwarded-For`, `Forwarded`, `Via`, `X-Real-IP` headers from all `/api` requests
- All outbound API calls use a generic Chrome User-Agent string to prevent device fingerprinting

## Authentication
- Replit Auth via OpenID Connect (Google, GitHub, X, Apple, email/password)
- Session stored in PostgreSQL via connect-pg-simple
- Landing page shown to unauthenticated users, map shown after login
- User profile badge with avatar and logout button on the map page
- Auth files in `server/replit_integrations/auth/` — do not modify
- User/session schemas in `shared/models/auth.ts` — do not drop these tables

## Key Features
1. **Map Tile Layers**: CartoDB Dark Matter (base), OpenStreetMap, OpenRailwayMap, Transport Infrastructure (MeMoMaps), OpenTopoMap, OpenAIP airspace, NASA FIRMS fire tiles
2. **Aviation Data**: OpenSky Network API - live flight tracking with rotated aircraft icons
3. **Hazard Data**: NASA EONET API - wildfires and severe storms
4. **GDACS Alerts**: Global Disaster Alert and Coordination System - real-time disaster events with alert levels
5. **Submarine Cables**: TeleGeography submarine cable map data rendered as colored GeoJSON lines
6. **Wikipedia Geo**: MediaWiki geosearch API
7. **Surveillance Cameras**: Overpass API querying OSM surveillance nodes
8. **Drawing Tools**: Leaflet-Draw for polygons, rectangles, circles, polylines, markers with edit/delete
9. **Export**: JPG and PDF export via html2canvas + jsPDF (hides UI during capture)
10. **Locate Me**: GPS geolocation
11. **External Links**: Broadcastify police scanner, NSOPW registry lookup

## File Structure
- `client/src/pages/map-page.tsx` - Main map page with all integrations
- `client/src/components/control-panel.tsx` - Floating layer toggle panel (12 layers)
- `client/src/components/map-layers.tsx` - All data layer components (aviation, hazards, wiki, surveillance, GDACS, submarine cables)
- `client/src/components/map-controls.tsx` - Floating action buttons (locate, export, scanner, registry)
- `client/src/components/map-draw-tools.tsx` - Leaflet-Draw integration via useMap hook
- `server/routes.ts` - Backend API proxy endpoints with anti-tracking and error handling
- `shared/schema.ts` - TypeScript interfaces and Zod schemas

## Layer Configuration (12 layers)
### Tile Overlays (6)
- **OpenStreetMap**: Standard OSM tiles at 40% opacity
- **Railway Map**: OpenRailwayMap overlay
- **Transport Infra**: MeMoMaps transport infrastructure tiles
- **Topographic**: OpenTopoMap tiles at 70% opacity
- **Airspace (AIP)**: OpenAIP TMS tiles at 70% opacity
- **NASA FIRMS Fires**: NASA WMTS fire radiative power tiles (max zoom 11)

### Data Feed Layers (6)
- **Aviation**: OpenSky Network, 15s refresh, bounded queries
- **Hazards**: NASA EONET, 5min stale time
- **GDACS Alerts**: GDACS REST API, GeoJSON circle markers colored by alert level
- **Subsea Cables**: TeleGeography, GeoJSON MultiLineString with per-cable colors
- **Wikipedia**: MediaWiki geosearch, center-based
- **Surveillance**: Overpass API, zoom 12+ only, bounded queries

## API Endpoints
- `GET /api/aviation?south=&west=&north=&east=` - OpenSky proxy
- `GET /api/hazards` - NASA EONET proxy
- `GET /api/wikipedia?lat=&lon=&radius=` - MediaWiki proxy
- `GET /api/surveillance?south=&west=&north=&east=` - Overpass API proxy
- `GET /api/gdacs` - GDACS REST API proxy (7-day window)
- `GET /api/submarine-cables` - TeleGeography cable GeoJSON proxy
- `GET /api/reverse-geocode?lat=&lon=` - Nominatim proxy
- `GET /api/health` - API status health check

## Theme
- Dark tactical aesthetic (near-black backgrounds, cyan/blue accents)
- Dark mode enabled by default via `class="dark"` on html element
- Custom Leaflet popup, draw toolbar, and control styling to match dark theme

## External API Notes
- OpenSky: Public endpoint, rate-limited. Add credentials for higher limits.
- NASA EONET: No key required
- GDACS: No key required, REST API at gdacs.org
- Submarine Cables: No key required, data from submarinecablemap.com
- OpenTopoMap: No key required, tile service
- OpenAIP: No key required, TMS tile service
- NASA FIRMS: No key required, WMTS tile service
- Overpass/Wikipedia/Nominatim: No key required, respect rate limits

## Package Constraints
- react-leaflet must be v4.2.1 (v5 requires React 19, project uses React 18)
- leaflet-draw CSS imported in main.tsx after leaflet CSS
