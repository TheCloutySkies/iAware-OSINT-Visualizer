import { useState, useCallback, useEffect } from "react";
import { MapContainer } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import type { ApiHealthStatus } from "@shared/schema";
import ControlPanel, { type LayerVisibility, type BaseMap } from "@/components/control-panel";
import MapControls from "@/components/map-controls";
import MapDrawTools from "@/components/map-draw-tools";
import WorkspaceSidebar, { WorkspaceSavedLayers } from "@/components/workspace-sidebar";
import {
  BaseMapLayer,
  TileOverlays,
  AviationLayer,
  HazardsLayer,
  WikipediaLayer,
  SurveillanceLayer,
  GdacsLayer,
  SubmarineCablesLayer,
  MilitaryBasesLayer,
} from "@/components/map-layers";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, User, FolderOpen } from "lucide-react";

const US_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 5;

export default function MapPage() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [baseMap, setBaseMap] = useState<BaseMap>("dark");
  const [layers, setLayers] = useState<LayerVisibility>({
    osm: false,
    railway: false,
    infrastructure: false,
    topomap: false,
    aviation: true,
    hazards: true,
    wikipedia: false,
    surveillance: false,
    openaip: false,
    firms: false,
    gdacs: false,
    cables: false,
    publicLands: false,
    military: false,
  });
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [visibleGroups, setVisibleGroups] = useState<Set<number>>(new Set());

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
        <BaseMapLayer baseMap={baseMap} />
        <TileOverlays layers={layers} />

        {layers.aviation && <AviationLayer />}
        {layers.hazards && <HazardsLayer />}
        {layers.wikipedia && <WikipediaLayer />}
        {layers.surveillance && <SurveillanceLayer />}
        {layers.gdacs && <GdacsLayer />}
        {layers.cables && <SubmarineCablesLayer />}
        {layers.military && <MilitaryBasesLayer />}

        <WorkspaceSavedLayers visibleGroups={visibleGroups} />

        <MapControls />
        <MapDrawTools />
      </MapContainer>

      <ControlPanel
        layers={layers}
        onToggle={handleToggle}
        health={health ?? null}
        baseMap={baseMap}
        onBaseMapChange={setBaseMap}
      />

      <div
        data-testid="user-profile"
        className="absolute top-3 left-3 z-[1000] flex items-center gap-2"
      >
        <div
          className="flex items-center gap-2 rounded-md border border-[hsl(215,15%,16%)] px-3 py-2"
          style={{ backgroundColor: "hsla(220, 18%, 8%, 0.92)", backdropFilter: "blur(12px)" }}
        >
          <User className="w-4 h-4 text-[hsl(195,90%,48%)]" />
          <span className="text-xs font-mono text-[hsl(200,15%,72%)]" data-testid="text-username">
            Operator
          </span>
          <button
            data-testid="button-workspace"
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className="ml-1 p-1 rounded text-[hsl(215,10%,48%)] hover:text-[hsl(195,90%,48%)] transition-colors"
            title="My Workspace"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button
            data-testid="button-logout"
            onClick={() => logout()}
            className="ml-1 p-1 rounded text-[hsl(215,10%,48%)] hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <WorkspaceSidebar
        open={workspaceOpen}
        onClose={() => setWorkspaceOpen(false)}
        visibleGroups={visibleGroups}
        onVisibleGroupsChange={setVisibleGroups}
      />

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
