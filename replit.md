# OSINT Tactical Map

## Overview
A full-stack OSINT and situational awareness map application with real-time data feeds, tactical dark UI, drawing tools with persistence, anonymous auth, and comprehensive map layer controls.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + React-Leaflet (v4) + Leaflet-Draw
- **Backend**: Node.js + Express (API proxy for external services)
- **Database**: PostgreSQL (Drizzle ORM) for anonymous user sessions, groups, and saved features
- **Auth**: Replit Auth (OpenID Connect) with SHA-256 hashed user IDs — no PII stored

## Security / Anti-Tracking
- `<meta name="referrer" content="no-referrer">` in index.html prevents referer leaking
- Backend strips `X-Forwarded-For`, `Forwarded`, `Via`, `X-Real-IP` headers from all `/api` requests
- All outbound API calls use a generic Chrome User-Agent string to prevent device fingerprinting
- User IDs are SHA-256 hashed before storage — no username, email, or profile data persisted

## Authentication
- Replit Auth via OpenID Connect (anonymous mode)
- Session stored in PostgreSQL via connect-pg-simple
- User ID is SHA-256 hash of Replit `sub` claim — never stores raw identity
- Auth files in `server/replit_integrations/auth/` — do not modify
- User/session schemas in `shared/models/auth.ts` — groups and saved_features tables also here

## Database Tables
- `sessions` — Replit Auth session storage (mandatory, do not drop)
- `users` — Hashed user records (mandatory, do not drop)
- `groups` — User workspace groups (id, user_id, name, created_at)
- `saved_features` — Saved map features (id, group_id, feature_type, geojson_data, color, opacity)

## Key Features
1. **Base Maps**: CartoDB Dark Matter (default), OpenStreetMap, Esri Satellite, Hybrid (Satellite + Labels), USGS Topo — mutually exclusive selection
2. **Tile Overlays**: Railway, Transport Infrastructure, OpenTopoMap, OpenAIP, NASA FIRMS, Public Lands (USGS WMS), Military Bases
3. **Data Feeds**: Aviation (OpenSky), Hazards (NASA EONET), GDACS Alerts, Submarine Cables, Wikipedia, Surveillance Cameras
4. **Drawing Tools**: Leaflet-Draw with color picker, opacity slider, and save-to-group functionality
5. **My Workspace**: Sidebar to create groups, save drawn features, toggle visibility on map, delete groups/features
6. **Export**: JPG and PDF export via html2canvas + jsPDF
7. **External Links**: Broadcastify police scanner, NSOPW registry lookup

## File Structure
- `client/src/pages/map-page.tsx` — Main map page with all integrations
- `client/src/components/control-panel.tsx` — Floating layer toggle panel with base map selector
- `client/src/components/map-layers.tsx` — All data layer components + base map + WMS + military
- `client/src/components/map-controls.tsx` — Floating action buttons
- `client/src/components/map-draw-tools.tsx` — Drawing tools with color/opacity/save UI
- `client/src/components/workspace-sidebar.tsx` — My Workspace sidebar + saved feature rendering
- `server/routes.ts` — Backend API proxy endpoints + workspace CRUD
- `shared/schema.ts` — TypeScript interfaces and Zod schemas
- `shared/models/auth.ts` — DB schema (users, sessions, groups, saved_features)

## API Endpoints
### Data Proxies
- `GET /api/aviation?south=&west=&north=&east=` — OpenSky proxy
- `GET /api/hazards` — NASA EONET proxy
- `GET /api/wikipedia?lat=&lon=&radius=` — MediaWiki proxy
- `GET /api/surveillance?south=&west=&north=&east=` — Overpass API proxy
- `GET /api/gdacs` — GDACS REST API proxy (7-day window)
- `GET /api/submarine-cables` — TeleGeography cable GeoJSON proxy
- `GET /api/military?south=&west=&north=&east=` — Overpass military landuse proxy
- `GET /api/reverse-geocode?lat=&lon=` — Nominatim proxy
- `GET /api/health` — API status health check

### Workspace CRUD (authenticated)
- `GET /api/groups` — List user's groups
- `POST /api/groups` — Create group {name}
- `DELETE /api/groups/:id` — Delete group
- `GET /api/groups/:id/features` — List features in group
- `POST /api/features` — Save feature {groupId, featureType, geojsonData, color, opacity}
- `DELETE /api/features/:id` — Delete feature

## Theme
- Dark tactical aesthetic (near-black backgrounds, cyan/blue accents)
- Dark mode enabled by default via `class="dark"` on html element

## Package Constraints
- react-leaflet must be v4.2.1 (v5 requires React 19, project uses React 18)
- leaflet-draw CSS imported in main.tsx after leaflet CSS
