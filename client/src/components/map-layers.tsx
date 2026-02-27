import { useEffect, useState, useRef, useCallback } from "react";
import { Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import type { FlightData, HazardEvent, WikiArticle, SurveillanceCamera, MarineVessel } from "@shared/schema";
import type { LayerVisibility } from "./control-panel";

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

const vesselSvg = (heading: number) => `
  <div style="transform: rotate(${heading || 0}deg); display: flex; align-items: center; justify-content: center;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L6 18H18L12 2Z" fill="#22d3ee" stroke="#0a1628" stroke-width="0.5"/>
    </svg>
  </div>
`;

export function TileOverlays({ layers }: { layers: LayerVisibility }) {
  return (
    <>
      {layers.osm && (
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          opacity={0.4}
        />
      )}
      {layers.railway && (
        <TileLayer
          url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
          attribution='OpenRailwayMap'
        />
      )}
      {layers.infrastructure && (
        <TileLayer
          url="https://tiles.openinframap.org/{z}/{x}/{y}.png"
          attribution='OpenInfraMap'
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

export function MarineLayer() {
  const [vessels, setVessels] = useState<Map<number, MarineVessel>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const bounds = useBounds();

  const connectWs = useCallback(() => {
    const API_KEY = "<YOUR_AISSTREAM_API_KEY>";

    if (API_KEY === "<YOUR_AISSTREAM_API_KEY>") {
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          APIKey: API_KEY,
          BoundingBoxes: [
            [
              [bounds.south, bounds.west],
              [bounds.north, bounds.east],
            ],
          ],
          FiltersShipMMSI: [],
          FilterMessageTypes: ["PositionReport"],
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.MessageType === "PositionReport") {
          const report = data.Message?.PositionReport;
          const meta = data.MetaData;
          if (report && meta) {
            setVessels((prev) => {
              const updated = new Map(prev);
              updated.set(meta.MMSI, {
                mmsi: meta.MMSI,
                name: meta.ShipName?.trim() || `MMSI ${meta.MMSI}`,
                latitude: report.Latitude,
                longitude: report.Longitude,
                cog: report.Cog || 0,
                sog: report.Sog || 0,
                heading: report.TrueHeading || report.Cog || 0,
                shipType: meta.ShipType || 0,
                timestamp: meta.time_utc || new Date().toISOString(),
              });
              return updated;
            });
          }
        }
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};
  }, [bounds.south, bounds.west, bounds.north, bounds.east]);

  useEffect(() => {
    connectWs();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWs]);

  return (
    <>
      {Array.from(vessels.values()).map((v) => (
        <Marker
          key={v.mmsi}
          position={[v.latitude, v.longitude]}
          icon={createSvgIcon(vesselSvg(v.heading), [16, 16])}
        >
          <Popup>
            <div style={{ color: "#e2e8f0", background: "#0f172a", padding: "8px", borderRadius: "6px", minWidth: "180px", fontSize: "12px" }}>
              <div style={{ fontWeight: 700, color: "#22d3ee", marginBottom: "4px" }}>
                {v.name}
              </div>
              <div>MMSI: {v.mmsi}</div>
              <div>Speed: {v.sog.toFixed(1)} knots</div>
              <div>Course: {v.cog.toFixed(0)}°</div>
              <div>Heading: {v.heading.toFixed(0)}°</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
