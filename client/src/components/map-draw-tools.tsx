import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuthUi } from "@/contexts/auth-ui-context";
import type { Group, SavedFeature } from "@shared/models/auth";

interface DrawToolsProps {
  onFeatureDrawn?: (geojson: any, color: string, opacity: number) => void;
}

export default function MapDrawTools({ onFeatureDrawn }: DrawToolsProps) {
  const map = useMap();
  const { isAuthenticated, requireAuth } = useAuthUi();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const [drawColor, setDrawColor] = useState("#00d4ff");
  const [drawOpacity, setDrawOpacity] = useState(0.8);
  const colorRef = useRef(drawColor);
  const opacityRef = useRef(drawOpacity);
  colorRef.current = drawColor;
  opacityRef.current = drawOpacity;
  const [showPanel, setShowPanel] = useState(false);
  const [pendingLayer, setPendingLayer] = useState<{ layer: L.Layer; geojson: any } | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: userGroups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  const saveFeatureMutation = useMutation({
    mutationFn: async (data: { groupId: number; featureType: string; geojsonData: string; color: string; opacity: number }) => {
      const res = await apiRequest("POST", "/api/features", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setPendingLayer(null);
    },
  });

  useEffect(() => {
    if (drawControlRef.current) return;

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    featureGroupRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      position: "topleft",
      draw: {
        polyline: {
          shapeOptions: {
            color: drawColor,
            weight: 2,
            opacity: drawOpacity,
          },
        },
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: drawColor,
            weight: 2,
            fillOpacity: drawOpacity * 0.2,
          },
        },
        rectangle: {
          shapeOptions: {
            color: drawColor,
            weight: 2,
            fillOpacity: drawOpacity * 0.2,
          },
        },
        circle: {
          shapeOptions: {
            color: drawColor,
            weight: 2,
            fillOpacity: drawOpacity * 0.2,
          },
        },
        marker: true,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    const onCreated = (e: any) => {
      const layer = e.layer;
      const currentColor = colorRef.current;
      const currentOpacity = opacityRef.current;
      if (layer.setStyle) {
        layer.setStyle({ color: currentColor, opacity: currentOpacity, fillOpacity: currentOpacity * 0.2 });
      }
      drawnItems.addLayer(layer);

      let geojson: any;
      if (layer instanceof L.Circle) {
        const center = layer.getLatLng();
        geojson = {
          type: "Feature",
          geometry: { type: "Point", coordinates: [center.lng, center.lat] },
          properties: { radius: layer.getRadius(), featureType: "circle", color: currentColor, opacity: currentOpacity },
        };
      } else if (layer.toGeoJSON) {
        geojson = layer.toGeoJSON();
        geojson.properties = { ...geojson.properties, color: currentColor, opacity: currentOpacity };
      }

      if (geojson) {
        const featureType = e.layerType || "unknown";
        geojson.properties.featureType = featureType;
        setPendingLayer({ layer, geojson });
        onFeatureDrawn?.(geojson, currentColor, currentOpacity);
      }
    };

    map.on(L.Draw.Event.CREATED, onCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
      if (featureGroupRef.current) {
        map.removeLayer(featureGroupRef.current);
        featureGroupRef.current = null;
      }
    };
  }, [map]);

  const handleSave = useCallback(() => {
    if (!pendingLayer || !selectedGroupId) return;
    const featureColor = pendingLayer.geojson.properties?.color || drawColor;
    const featureOpacity = pendingLayer.geojson.properties?.opacity || drawOpacity;
    saveFeatureMutation.mutate({
      groupId: selectedGroupId,
      featureType: pendingLayer.geojson.properties?.featureType || "unknown",
      geojsonData: JSON.stringify(pendingLayer.geojson),
      color: featureColor,
      opacity: featureOpacity,
    });
  }, [pendingLayer, selectedGroupId, drawColor, drawOpacity]);

  return (
    <>
      <div
        data-testid="draw-tools-panel"
        className="absolute top-[180px] left-3 z-[1000]"
      >
        <button
          data-testid="button-draw-settings"
          onClick={() => setShowPanel(!showPanel)}
          className="flex items-center justify-center w-9 h-9 rounded-md bg-[hsl(220,18%,8%)] border border-[hsl(215,15%,16%)] text-muted-foreground transition-colors mb-1"
          style={{ backdropFilter: "blur(12px)" }}
          title="Draw Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

        {showPanel && (
          <div
            className="rounded-md border border-[hsl(215,15%,16%)] p-3 w-48"
            style={{ backgroundColor: "hsla(220, 18%, 8%, 0.95)", backdropFilter: "blur(16px)" }}
          >
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Draw Settings</p>

            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  data-testid="input-draw-color"
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                />
                <input
                  data-testid="input-draw-color-hex"
                  type="text"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="flex-1 bg-[hsl(220,15%,12%)] border border-[hsl(215,15%,20%)] rounded px-2 py-1 text-xs text-foreground font-mono"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-1">
                Opacity: {drawOpacity.toFixed(1)}
              </label>
              <input
                data-testid="input-draw-opacity"
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={drawOpacity}
                onChange={(e) => setDrawOpacity(parseFloat(e.target.value))}
                className="w-full accent-[hsl(195,90%,48%)]"
              />
            </div>

            {pendingLayer && (
              <div className="border-t border-[hsl(215,15%,16%)] pt-2 mt-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Save Drawing</p>
                {!isAuthenticated ? (
                  <button
                    data-testid="button-save-feature"
                    onClick={() => requireAuth()}
                    className="w-full border border-[hsl(195,90%,48%)] text-[hsl(195,90%,48%)] text-xs font-semibold py-1.5 rounded transition-colors hover:bg-[hsl(195,90%,48%)] hover:text-[hsl(220,20%,4%)]"
                  >
                    Login to Save
                  </button>
                ) : (
                  <>
                    <select
                      data-testid="select-save-group"
                      value={selectedGroupId || ""}
                      onChange={(e) => setSelectedGroupId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-[hsl(220,15%,12%)] border border-[hsl(215,15%,20%)] rounded px-2 py-1 text-xs text-foreground mb-2"
                    >
                      <option value="">Select group...</option>
                      {userGroups?.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <button
                      data-testid="button-save-feature"
                      onClick={handleSave}
                      disabled={!selectedGroupId || saveFeatureMutation.isPending}
                      className="w-full bg-[hsl(195,90%,48%)] text-[hsl(220,20%,4%)] text-xs font-semibold py-1.5 rounded disabled:opacity-40 transition-opacity"
                    >
                      {saveFeatureMutation.isPending ? "Saving..." : "Save Feature"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
