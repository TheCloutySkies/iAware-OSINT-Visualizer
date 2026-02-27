import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Layers, ChevronRight, ChevronLeft, Plane, Ship, AlertTriangle, BookOpen, Camera, Map, TrainFront, Zap } from "lucide-react";
import type { ApiHealthStatus } from "@shared/schema";

export interface LayerVisibility {
  osm: boolean;
  railway: boolean;
  infrastructure: boolean;
  aviation: boolean;
  marine: boolean;
  hazards: boolean;
  wikipedia: boolean;
  surveillance: boolean;
}

interface ControlPanelProps {
  layers: LayerVisibility;
  onToggle: (layer: keyof LayerVisibility) => void;
  health: ApiHealthStatus | null;
}

function StatusDot({ status }: { status: "green" | "yellow" | "red" }) {
  const colors = {
    green: "bg-emerald-400 shadow-emerald-400/50",
    yellow: "bg-amber-400 shadow-amber-400/50",
    red: "bg-red-400 shadow-red-400/50",
  };
  return (
    <span
      data-testid={`status-dot-${status}`}
      className={`inline-block w-2 h-2 rounded-full shadow-sm ${colors[status]}`}
    />
  );
}

interface LayerRowProps {
  icon: React.ReactNode;
  label: string;
  layerKey: keyof LayerVisibility;
  checked: boolean;
  onToggle: (key: keyof LayerVisibility) => void;
  healthStatus?: "green" | "yellow" | "red";
}

function LayerRow({ icon, label, layerKey, checked, onToggle, healthStatus }: LayerRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="text-sm truncate">{label}</span>
        {healthStatus && <StatusDot status={healthStatus} />}
      </div>
      <Switch
        data-testid={`toggle-${layerKey}`}
        checked={checked}
        onCheckedChange={() => onToggle(layerKey)}
      />
    </div>
  );
}

export default function ControlPanel({ layers, onToggle, health }: ControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      data-testid="control-panel"
      className="absolute top-3 right-3 z-[1000] flex items-start gap-0"
    >
      <button
        data-testid="button-toggle-panel"
        onClick={() => setCollapsed(!collapsed)}
        className="mt-2 flex items-center justify-center w-9 h-9 rounded-l-md bg-[hsl(220,18%,8%)] border border-r-0 border-[hsl(215,15%,16%)] text-muted-foreground transition-colors"
        style={{ backdropFilter: "blur(12px)" }}
      >
        {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div
        className={`transition-all duration-300 ease-in-out origin-right ${
          collapsed
            ? "w-0 opacity-0 overflow-hidden"
            : "w-64 opacity-100"
        }`}
      >
        <div
          className="rounded-md border border-[hsl(215,15%,16%)] p-4"
          style={{
            backgroundColor: "hsla(220, 18%, 8%, 0.92)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-[hsl(195,90%,48%)]" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[hsl(195,90%,48%)]">
              Layers
            </h2>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Tile Overlays</p>
            <LayerRow icon={<Map className="w-3.5 h-3.5" />} label="OpenStreetMap" layerKey="osm" checked={layers.osm} onToggle={onToggle} />
            <LayerRow icon={<TrainFront className="w-3.5 h-3.5" />} label="Railway Map" layerKey="railway" checked={layers.railway} onToggle={onToggle} />
            <LayerRow icon={<Zap className="w-3.5 h-3.5" />} label="Infrastructure" layerKey="infrastructure" checked={layers.infrastructure} onToggle={onToggle} />
          </div>

          <div className="my-3 border-t border-[hsl(215,15%,16%)]" />

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Data Feeds</p>
            <LayerRow icon={<Plane className="w-3.5 h-3.5" />} label="Aviation" layerKey="aviation" checked={layers.aviation} onToggle={onToggle} healthStatus={health?.aviation} />
            <LayerRow icon={<Ship className="w-3.5 h-3.5" />} label="Marine AIS" layerKey="marine" checked={layers.marine} onToggle={onToggle} />
            <LayerRow icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Hazards" layerKey="hazards" checked={layers.hazards} onToggle={onToggle} healthStatus={health?.hazards} />
            <LayerRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Wikipedia" layerKey="wikipedia" checked={layers.wikipedia} onToggle={onToggle} healthStatus={health?.wikipedia} />
            <LayerRow icon={<Camera className="w-3.5 h-3.5" />} label="Surveillance" layerKey="surveillance" checked={layers.surveillance} onToggle={onToggle} healthStatus={health?.surveillance} />
          </div>

          {health && (
            <>
              <div className="my-3 border-t border-[hsl(215,15%,16%)]" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">System</span>
                <StatusDot
                  status={
                    Object.values(health).every((s) => s === "green")
                      ? "green"
                      : Object.values(health).some((s) => s === "red")
                        ? "red"
                        : "yellow"
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
