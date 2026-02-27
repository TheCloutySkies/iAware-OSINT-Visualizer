import { useState, useCallback, useEffect } from "react";
import { MapContainer } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import type { ApiHealthStatus } from "@shared/schema";
import ControlPanel, { type LayerVisibility, type BaseMap } from "@/components/control-panel";
import MapControls from "@/components/map-controls";
import MapDrawTools from "@/components/map-draw-tools";
import WorkspaceSidebar, { WorkspaceSavedLayers } from "@/components/workspace-sidebar";
import WelcomeModal from "@/components/welcome-modal";
import AuthPromptModal from "@/components/auth-prompt-modal";
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
import { useAuthUi } from "@/contexts/auth-ui-context";
import { Shield, FolderOpen, LogIn, LogOut } from "lucide-react";

const US_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 5;

export default function MapPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, authPromptOpen, closeAuthPrompt, requireAuth } = useAuthUi();

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

  const handleWorkspaceOpen = useCallback(() => {
    if (!requireAuth()) return;
    setWorkspaceOpen(true);
  }, [requireAuth]);

  return (
    <div data-testid="map-container" className="relative w-screen h-screen overflow-hidden flex flex-col">
      <nav
        data-testid="top-nav"
        className="relative z-[1001] flex items-center justify-between px-4 h-11 shrink-0"
        style={{
          backgroundColor: "hsla(220, 20%, 5%, 0.96)",
          borderBottom: "1px solid hsl(215, 15%, 14%)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-[hsl(195,90%,48%)]" />
          <span
            data-testid="text-app-title"
            className="font-mono text-xs font-bold tracking-widest uppercase text-[hsl(195,90%,48%)]"
          >
            iAware OSINT Visualizer
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="text-[11px] font-mono text-[hsl(215,10%,40%)]">···</span>
          ) : isAuthenticated ? (
            <>
              <span
                data-testid="text-workspace-status"
                className="text-[11px] font-mono text-[hsl(145,70%,48%)] flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(145,70%,48%)] inline-block" />
                Workspace Active
              </span>
              <button
                data-testid="button-workspace"
                onClick={() => setWorkspaceOpen(!workspaceOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border border-[hsl(215,15%,18%)] text-[hsl(200,15%,65%)] hover:text-[hsl(195,90%,48%)] hover:border-[hsl(195,90%,48%)] transition-colors"
                title="My Workspace"
              >
                <FolderOpen className="w-3 h-3" />
                Workspace
              </button>
              <a
                data-testid="button-logout"
                href="/api/logout"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border border-[hsl(215,15%,18%)] text-[hsl(200,15%,65%)] hover:text-red-400 hover:border-red-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3 h-3" />
                Logout
              </a>
            </>
          ) : (
            <>
              <span
                data-testid="text-guest-status"
                className="text-[11px] font-mono text-[hsl(215,10%,48%)] flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(215,10%,35%)] inline-block" />
                Guest Mode
              </span>
              <button
                data-testid="button-workspace"
                onClick={handleWorkspaceOpen}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border border-[hsl(215,15%,18%)] text-[hsl(200,15%,65%)] hover:text-[hsl(195,90%,48%)] hover:border-[hsl(195,90%,48%)] transition-colors"
                title="My Workspace (login required)"
              >
                <FolderOpen className="w-3 h-3" />
                Workspace
              </button>
              <a
                data-testid="button-login"
                href="/api/login"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border border-[hsl(195,90%,48%)] text-[hsl(195,90%,48%)] hover:bg-[hsl(195,90%,48%)] hover:text-[hsl(220,25%,5%)] transition-colors"
              >
                <LogIn className="w-3 h-3" />
                Login
              </a>
            </>
          )}
        </div>
      </nav>

      <div className="flex-1 relative">
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

          {isAuthenticated && <WorkspaceSavedLayers visibleGroups={visibleGroups} />}

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

        {isAuthenticated && (
          <WorkspaceSidebar
            open={workspaceOpen}
            onClose={() => setWorkspaceOpen(false)}
            visibleGroups={visibleGroups}
            onVisibleGroupsChange={setVisibleGroups}
          />
        )}

        <div
          data-testid="text-branding"
          className="absolute bottom-3 right-3 z-[1000] pointer-events-none select-none"
        >
          <span
            className="text-[10px] font-mono tracking-widest uppercase"
            style={{ color: "hsla(195, 90%, 48%, 0.35)" }}
          >
            iAware
          </span>
        </div>
      </div>

      <WelcomeModal />
      <AuthPromptModal open={authPromptOpen} onClose={closeAuthPrompt} />
    </div>
  );
}
