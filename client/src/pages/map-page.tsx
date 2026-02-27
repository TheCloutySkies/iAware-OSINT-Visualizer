import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import type { ApiHealthStatus } from "@shared/schema";
import ControlPanel, { type LayerVisibility } from "@/components/control-panel";
import MapControls from "@/components/map-controls";
import MapDrawTools from "@/components/map-draw-tools";
import {
  TileOverlays,
  AviationLayer,
  HazardsLayer,
  WikipediaLayer,
  SurveillanceLayer,
  MarineLayer,
} from "@/components/map-layers";
import { useToast } from "@/hooks/use-toast";

const US_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 5;

export default function MapPage() {
  const { toast } = useToast();
  const [layers, setLayers] = useState<LayerVisibility>({
    osm: false,
    railway: false,
    infrastructure: false,
    aviation: true,
    marine: false,
    hazards: true,
    wikipedia: false,
    surveillance: false,
  });

  const { data: health } = useQuery<ApiHealthStatus>({
    queryKey: ["/api/health"],
    refetchInterval: 30000,
    staleTime: 15000,
  });

  useEffect(() => {
    if (!health) return;
    const degraded = Object.entries(health).filter(([, v]) => v === "red");
    degraded.forEach(([key]) => {
      toast({
        title: `Layer ${key} degraded`,
        description: "Data feed is temporarily unavailable",
        variant: "destructive",
      });
    });
  }, [health]);

  const handleToggle = useCallback((layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  return (
    <div data-testid="map-container" className="relative w-screen h-screen overflow-hidden">
      <MapContainer
        center={US_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />

        <TileOverlays layers={layers} />

        {layers.aviation && <AviationLayer />}
        {layers.hazards && <HazardsLayer />}
        {layers.wikipedia && <WikipediaLayer />}
        {layers.surveillance && <SurveillanceLayer />}
        {layers.marine && <MarineLayer />}

        <MapControls />
        <MapDrawTools />
      </MapContainer>

      <ControlPanel layers={layers} onToggle={handleToggle} health={health ?? null} />

      <div
        data-testid="text-branding"
        className="absolute bottom-3 right-3 z-[1000] pointer-events-none select-none"
      >
        <span
          className="text-[10px] font-mono tracking-widest uppercase"
          style={{ color: "hsla(195, 90%, 48%, 0.4)" }}
        >
          OSINT TACTICAL MAP
        </span>
      </div>
    </div>
  );
}
