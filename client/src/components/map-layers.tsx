import { useState, useMemo, useEffect } from "react";
import { Marker, Popup, TileLayer, WMSTileLayer, GeoJSON, Polygon, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import type { FlightData, HazardEvent, WikiArticle, SurveillanceCamera } from "@shared/schema";
import type { LayerVisibility, BaseMap } from "./control-panel";

function useBounds() {
  const map = useMap();
  const [bounds, setBounds] = useState(() => {
    const b = map.getBounds();
    return {
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    };
  });

  useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      setBounds({
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      });
    },
  });

  return bounds;
}

function useMapCenter() {
  const map = useMap();
  const [center, setCenter] = useState(() => {
    const c = map.getCenter();
    return { lat: c.lat, lon: c.lng };
  });

  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      setCenter({ lat: c.lat, lon: c.lng });
    },
  });

  return center;
}

function createSvgIcon(svg: string, size: [number, number] = [24, 24], anchor?: [number, number]) {
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: size,
    iconAnchor: anchor || [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2],
  });
}

const aircraftSvg = (heading: number) => `
  <div style="transform: rotate(${heading || 0}deg); display: flex; align-items: center; justify-content: center;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L8 10H3L5 13H9L8 22H10L14 13H19L21 10H16L12 2Z" fill="#00d4ff" stroke="#0a1628" stroke-width="0.5"/>
    </svg>
  </div>
`;

const hazardFireIcon = createSvgIcon(
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#ff4500" fill-opacity="0.25" stroke="#ff4500" stroke-width="1.5"/>
    <path d="M12 6C12 6 8 10 8 13C8 15.2 9.8 17 12 17C14.2 17 16 15.2 16 13C16 10 12 6 12 6Z" fill="#ff6b35"/>
  </svg>`,
  [22, 22]
);

const hazardStormIcon = createSvgIcon(
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#9333ea" fill-opacity="0.25" stroke="#9333ea" stroke-width="1.5"/>
    <path d="M13 4L8 14H11L10 20L16 10H13L13 4Z" fill="#c084fc"/>
  </svg>`,
  [22, 22]
);

const wikiIcon = createSvgIcon(
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" fill="#1e3a5f" stroke="#3b82f6" stroke-width="1.5"/>
    <text x="12" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#93c5fd">W</text>
  </svg>`,
  [18, 18]
);

const cameraIcon = createSvgIcon(
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" fill="#1a1a2e" stroke="#f59e0b" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="1.5" fill="#fbbf24"/>
  </svg>`,
  [18, 18]
);

export function BaseMapLayer({ baseMap }: { baseMap: BaseMap }) {
  switch (baseMap) {
    case "osm_standard":
      return (
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
      );
    case "satellite":
      return (
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri'
          maxZoom={19}
        />
      );
    case "hybrid":
      return (
        <>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri'
            maxZoom={19}
          />
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri'
            maxZoom={19}
          />
        </>
      );
    case "usgs_topo":
      return (
        <TileLayer
          url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; USGS'
          maxZoom={16}
        />
      );
    case "dark":
    default:
      return (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
      );
  }
}

export function TileOverlays({ layers }: { layers: LayerVisibility }) {
  return (
    <>
      {layers.railway && (
        <TileLayer
          url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
          attribution='OpenRailwayMap'
        />
      )}
      {layers.infrastructure && (
        <TileLayer
          url="https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png"
          attribution='&copy; MeMoMaps &copy; OpenStreetMap'
          maxZoom={17}
        />
      )}
      {layers.topomap && (
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenTopoMap'
          maxZoom={17}
          opacity={0.7}
        />
      )}
      {layers.openaip && (
        <TileLayer
          url="https://{s}.tile.maps.openaip.net/geowebcache/service/tms/1.0.0/openaip_basemap@EPSG%3A900913@png/{z}/{x}/{y}.png"
          attribution='&copy; OpenAIP'
          tms={true}
          opacity={0.7}
        />
      )}
      {layers.firms && (
        <TileLayer
          url="https://map1.vis.earthdata.nasa.gov/wmts-webmerc/FIRMS_Active_Fires/default/default/GoogleMapsCompatible_Level11/{z}/{y}/{x}.png"
          attribution='&copy; NASA FIRMS'
          maxZoom={11}
          opacity={0.9}
        />
      )}
      {layers.publicLands && (
        <WMSTileLayer
          url="https://services.nationalmap.gov/arcgis/services/govunits/MapServer/WMSServer"
          params={{
            layers: "11",
            format: "image/png",
            transparent: true,
          }}
          opacity={0.5}
          attribution='&copy; USGS PAD-US'
        />
      )}
    </>
  );
}

export function AviationLayer() {
  const bounds = useBounds();

  const { data: flights } = useQuery<FlightData[]>({
    queryKey: ["/api/aviation", bounds.south, bounds.west, bounds.north, bounds.east],
    queryFn: async () => {
      const res = await fetch(
        `/api/aviation?south=${bounds.south}&west=${bounds.west}&north=${bounds.north}&east=${bounds.east}`
      );
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  if (!flights) return null;

  return (
    <>
      {flights
        .filter((f) => f.latitude != null && f.longitude != null)
        .slice(0, 500)
        .map((f) => (
          <Marker
            key={f.icao24}
            position={[f.latitude!, f.longitude!]}
            icon={createSvgIcon(aircraftSvg(f.trueTrack || 0), [20, 20])}
          >
            <Popup>
              <div style={{ color: "#e2e8f0", background: "#0f172a", padding: "8px", borderRadius: "6px", minWidth: "180px", fontSize: "12px" }}>
                <div style={{ fontWeight: 700, color: "#00d4ff", marginBottom: "4px" }}>
                  {f.callsign || f.icao24}
                </div>
                <div>Country: {f.originCountry}</div>
                <div>Altitude: {f.baroAltitude ? `${Math.round(f.baroAltitude)}m` : "N/A"}</div>
                <div>Speed: {f.velocity ? `${Math.round(f.velocity)}m/s` : "N/A"}</div>
                <div>Heading: {f.trueTrack ? `${Math.round(f.trueTrack)}°` : "N/A"}</div>
                <div>Status: {f.onGround ? "On Ground" : "Airborne"}</div>
              </div>
            </Popup>
          </Marker>
        ))}
    </>
  );
}

export function HazardsLayer() {
  const { data: hazards } = useQuery<HazardEvent[]>({
    queryKey: ["/api/hazards"],
    queryFn: async () => {
      const res = await fetch("/api/hazards");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 300000,
  });

  if (!hazards) return null;

  return (
    <>
      {hazards.map((h) => {
        const geo = h.geometry?.[0];
        if (!geo || !geo.coordinates) return null;
        const [lon, lat] = geo.coordinates;
        if (lat == null || lon == null) return null;
        const isWildfire = h.categories?.some((c) => c.id === "wildfires");

        return (
          <Marker
            key={h.id}
            position={[lat, lon]}
            icon={isWildfire ? hazardFireIcon : hazardStormIcon}
          >
            <Popup>
              <div style={{ color: "#e2e8f0", background: "#0f172a", padding: "8px", borderRadius: "6px", minWidth: "200px", fontSize: "12px" }}>
                <div style={{ fontWeight: 700, color: isWildfire ? "#ff6b35" : "#c084fc", marginBottom: "4px" }}>
                  {isWildfire ? "🔥 " : "⚡ "}{h.title}
                </div>
                <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                  {geo.date ? new Date(geo.date).toLocaleDateString() : "Active"}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export function WikipediaLayer() {
  const center = useMapCenter();

  const { data: articles } = useQuery<WikiArticle[]>({
    queryKey: ["/api/wikipedia", Math.round(center.lat * 100) / 100, Math.round(center.lon * 100) / 100],
    queryFn: async () => {
      const res = await fetch(`/api/wikipedia?lat=${center.lat}&lon=${center.lon}&radius=10000`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  if (!articles) return null;

  return (
    <>
      {articles.map((a) => (
        <Marker key={a.pageid} position={[a.lat, a.lon]} icon={wikiIcon}>
          <Popup>
            <div style={{ color: "#e2e8f0", background: "#0f172a", padding: "8px", borderRadius: "6px", minWidth: "180px", fontSize: "12px" }}>
              <div style={{ fontWeight: 700, color: "#93c5fd", marginBottom: "4px" }}>
                {a.title}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "6px" }}>
                {Math.round(a.dist)}m away
              </div>
              <a
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(a.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#3b82f6", textDecoration: "underline", fontSize: "11px" }}
                data-testid={`link-wiki-${a.pageid}`}
              >
                Read on Wikipedia →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export function SurveillanceLayer() {
  const bounds = useBounds();
  const map = useMap();
  const zoom = map.getZoom();

  const { data: cameras } = useQuery<SurveillanceCamera[]>({
    queryKey: ["/api/surveillance", Math.round(bounds.south * 10) / 10, Math.round(bounds.west * 10) / 10, Math.round(bounds.north * 10) / 10, Math.round(bounds.east * 10) / 10],
    queryFn: async () => {
      if (zoom < 12) return [];
      const res = await fetch(
        `/api/surveillance?south=${bounds.south}&west=${bounds.west}&north=${bounds.north}&east=${bounds.east}`
      );
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 120000,
    enabled: zoom >= 12,
  });

  if (!cameras || zoom < 12) return null;

  return (
    <>
      {cameras.slice(0, 200).map((c) => (
        <Marker key={c.id} position={[c.lat, c.lon]} icon={cameraIcon}>
          <Popup>
            <div style={{ color: "#e2e8f0", background: "#0f172a", padding: "8px", borderRadius: "6px", minWidth: "160px", fontSize: "12px" }}>
              <div style={{ fontWeight: 700, color: "#fbbf24", marginBottom: "4px" }}>
                Surveillance Camera
              </div>
              {c.tags?.["surveillance:type"] && (
                <div>Type: {c.tags["surveillance:type"]}</div>
              )}
              {c.tags?.operator && (
                <div>Operator: {c.tags.operator}</div>
              )}
              {c.tags?.description && (
                <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>{c.tags.description}</div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function getGdacsColor(alertlevel: string | undefined): string {
  const level = (alertlevel || "").toLowerCase();
  if (level === "red") return "#ef4444";
  if (level === "orange") return "#f97316";
  return "#22c55e";
}

export function GdacsLayer() {
  const { data: geojson } = useQuery<any>({
    queryKey: ["/api/gdacs"],
    queryFn: async () => {
      const res = await fetch("/api/gdacs");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 300000,
  });

  const pointToLayer = useMemo(() => {
    return (feature: any, latlng: L.LatLng) => {
      const color = getGdacsColor(feature?.properties?.alertlevel);
      return L.circleMarker(latlng, {
        radius: 8,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.4,
      });
    };
  }, []);

  const onEachFeature = useMemo(() => {
    return (feature: any, layer: L.Layer) => {
      if (feature?.properties) {
        const p = feature.properties;
        const color = getGdacsColor(p.alertlevel);
        const detailUrl = typeof p.url === "object" ? p.url?.report : p.url;
        layer.bindPopup(
          `<div style="color: #e2e8f0; background: #0f172a; padding: 8px; border-radius: 6px; min-width: 200px; font-size: 12px;">
            <div style="font-weight: 700; color: ${color}; margin-bottom: 4px;">
              ${p.eventtype || "Event"}: ${p.name || p.eventname || "Unknown"}
            </div>
            <div>Alert: <span style="color: ${color}; font-weight: 600;">${p.alertlevel || "Green"}</span></div>
            ${p.country ? `<div>Country: ${p.country}</div>` : ""}
            ${p.description ? `<div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">${p.description}</div>` : ""}
            ${detailUrl ? `<a href="${detailUrl}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; font-size: 11px;">Details →</a>` : ""}
          </div>`,
          { className: "custom-popup" }
        );
      }
    };
  }, []);

  if (!geojson || !geojson.features?.length) return null;

  return (
    <GeoJSON
      key={JSON.stringify(geojson.features?.length)}
      data={geojson}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  );
}

export function SubmarineCablesLayer() {
  const { data: geojson } = useQuery<any>({
    queryKey: ["/api/submarine-cables"],
    queryFn: async () => {
      const res = await fetch("/api/submarine-cables");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 3600000,
  });

  const style = useMemo(() => {
    return (feature: any) => ({
      color: feature?.properties?.color || "#00e5ff",
      weight: 1.5,
      opacity: 0.6,
    });
  }, []);

  const onEachFeature = useMemo(() => {
    return (feature: any, layer: L.Layer) => {
      if (feature?.properties) {
        const p = feature.properties;
        layer.bindPopup(
          `<div style="color: #e2e8f0; background: #0f172a; padding: 8px; border-radius: 6px; min-width: 180px; font-size: 12px;">
            <div style="font-weight: 700; color: #00e5ff; margin-bottom: 4px;">
              ${p.name || "Submarine Cable"}
            </div>
            ${p.owners ? `<div style="color: #94a3b8; font-size: 11px;">Owners: ${p.owners}</div>` : ""}
            ${p.length ? `<div style="color: #94a3b8; font-size: 11px;">Length: ${p.length} km</div>` : ""}
            ${p.rfs ? `<div style="color: #94a3b8; font-size: 11px;">RFS: ${p.rfs}</div>` : ""}
            ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; font-size: 11px;">Details →</a>` : ""}
          </div>`,
          { className: "custom-popup" }
        );
      }
    };
  }, []);

  if (!geojson || !geojson.features?.length) return null;

  return (
    <GeoJSON
      key={JSON.stringify(geojson.features?.length)}
      data={geojson}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

interface MilitaryElement {
  type: string;
  id: number;
  geometry: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

export function MilitaryBasesLayer() {
  const bounds = useBounds();
  const map = useMap();
  const zoom = map.getZoom();

  const { data: elements } = useQuery<MilitaryElement[]>({
    queryKey: ["/api/military", Math.round(bounds.south), Math.round(bounds.west), Math.round(bounds.north), Math.round(bounds.east)],
    queryFn: async () => {
      if (zoom < 8) return [];
      const res = await fetch(
        `/api/military?south=${bounds.south}&west=${bounds.west}&north=${bounds.north}&east=${bounds.east}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.elements || [];
    },
    staleTime: 300000,
    enabled: zoom >= 8,
  });

  if (!elements || zoom < 8) return null;

  return (
    <>
      {elements.filter(el => el.geometry && el.geometry.length > 2).slice(0, 100).map((el) => {
        const positions: [number, number][] = el.geometry.map(g => [g.lat, g.lon]);
        return (
          <Polygon
            key={el.id}
            positions={positions}
            pathOptions={{ color: "#ef4444", weight: 2, fillColor: "#ef4444", fillOpacity: 0.15 }}
          >
            <Popup>
              <div style={{ color: "#e2e8f0", background: "#0f172a", padding: "8px", borderRadius: "6px", minWidth: "160px", fontSize: "12px" }}>
                <div style={{ fontWeight: 700, color: "#ef4444", marginBottom: "4px" }}>
                  {el.tags?.name || "Military Installation"}
                </div>
                {el.tags?.["military"] && (
                  <div>Type: {el.tags["military"]}</div>
                )}
                {el.tags?.operator && (
                  <div>Operator: {el.tags.operator}</div>
                )}
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}
