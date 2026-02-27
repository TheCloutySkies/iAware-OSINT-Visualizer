import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { Group, SavedFeature } from "@shared/models/auth";
import { FolderOpen, Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronRight, X } from "lucide-react";

interface WorkspaceSidebarProps {
  open: boolean;
  onClose: () => void;
  visibleGroups: Set<number>;
  onVisibleGroupsChange: (groups: Set<number>) => void;
}

export function WorkspaceSavedLayers({ visibleGroups }: { visibleGroups: Set<number> }) {
  const { data: userGroups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  return (
    <>
      {userGroups?.filter(g => visibleGroups.has(g.id)).map(group => (
        <GroupFeatures key={group.id} groupId={group.id} />
      ))}
    </>
  );
}

function GroupFeatures({ groupId }: { groupId: number }) {
  const { data: features } = useQuery<SavedFeature[]>({
    queryKey: ["/api/groups", groupId, "features"],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/features`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  if (!features?.length) return null;

  return (
    <>
      {features.map(f => {
        try {
          const geojson = JSON.parse(f.geojsonData);
          if (geojson.properties?.featureType === "circle" && geojson.properties?.radius) {
            return (
              <CircleFeature key={f.id} geojson={geojson} color={f.color} opacity={f.opacity} />
            );
          }
          return (
            <GeoJSON
              key={f.id}
              data={geojson}
              style={() => ({
                color: f.color,
                weight: 2,
                opacity: f.opacity,
                fillOpacity: f.opacity * 0.2,
              })}
            />
          );
        } catch {
          return null;
        }
      })}
    </>
  );
}

function CircleFeature({ geojson, color, opacity }: { geojson: any; color: string; opacity: number }) {
  const map = useMap();
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    const [lng, lat] = geojson.geometry.coordinates;
    const circle = L.circle([lat, lng], {
      radius: geojson.properties.radius,
      color,
      weight: 2,
      opacity,
      fillOpacity: opacity * 0.2,
    }).addTo(map);
    circleRef.current = circle;

    return () => {
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
    };
  }, [map, geojson, color, opacity]);

  return null;
}

export default function WorkspaceSidebar({ open, onClose, visibleGroups, onVisibleGroupsChange }: WorkspaceSidebarProps) {
  const queryClient = useQueryClient();
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const { data: userGroups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/groups", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setNewGroupName("");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/groups/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      const next = new Set(visibleGroups);
      next.delete(id);
      onVisibleGroupsChange(next);
    },
  });

  const deleteFeatureMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/features/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  const toggleExpand = useCallback((id: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleVisibility = useCallback((id: number) => {
    const next = new Set(visibleGroups);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onVisibleGroupsChange(next);
  }, [visibleGroups, onVisibleGroupsChange]);

  const handleCreateGroup = useCallback(() => {
    if (newGroupName.trim()) {
      createGroupMutation.mutate(newGroupName.trim());
    }
  }, [newGroupName]);

  if (!open) return null;

  return (
    <div
      data-testid="workspace-sidebar"
      className="absolute top-0 left-0 z-[1001] h-full w-72 overflow-y-auto"
      style={{
        backgroundColor: "hsla(220, 18%, 6%, 0.96)",
        backdropFilter: "blur(16px)",
        borderRight: "1px solid hsl(215, 15%, 16%)",
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[hsl(195,90%,48%)]" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[hsl(195,90%,48%)]">
              My Workspace
            </h2>
          </div>
          <button
            data-testid="button-close-workspace"
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex gap-1">
            <input
              data-testid="input-new-group"
              type="text"
              placeholder="New group name..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              className="flex-1 bg-[hsl(220,15%,10%)] border border-[hsl(215,15%,20%)] rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
            />
            <button
              data-testid="button-create-group"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || createGroupMutation.isPending}
              className="px-2 py-1.5 bg-[hsl(195,90%,48%)] text-[hsl(220,20%,4%)] rounded text-xs font-semibold disabled:opacity-40 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-xs text-muted-foreground text-center py-4">Loading...</div>
        ) : !userGroups?.length ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            No groups yet. Create one above to save map features.
          </div>
        ) : (
          <div className="space-y-1">
            {userGroups.map((group) => (
              <GroupItem
                key={group.id}
                group={group}
                expanded={expandedGroups.has(group.id)}
                visible={visibleGroups.has(group.id)}
                onToggleExpand={() => toggleExpand(group.id)}
                onToggleVisibility={() => toggleVisibility(group.id)}
                onDelete={() => deleteGroupMutation.mutate(group.id)}
                onDeleteFeature={(id) => deleteFeatureMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface GroupItemProps {
  group: Group;
  expanded: boolean;
  visible: boolean;
  onToggleExpand: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onDeleteFeature: (id: number) => void;
}

function GroupItem({ group, expanded, visible, onToggleExpand, onToggleVisibility, onDelete, onDeleteFeature }: GroupItemProps) {
  const { data: features } = useQuery<SavedFeature[]>({
    queryKey: ["/api/groups", group.id, "features"],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${group.id}/features`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
    enabled: expanded,
  });

  return (
    <div className="rounded border border-[hsl(215,15%,16%)] overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[hsl(220,15%,10%)]">
        <button onClick={onToggleExpand} className="text-muted-foreground p-0.5">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <span className="flex-1 text-xs font-medium truncate" data-testid={`text-group-name-${group.id}`}>
          {group.name}
        </span>
        <button
          data-testid={`button-toggle-group-${group.id}`}
          onClick={onToggleVisibility}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title={visible ? "Hide on map" : "Show on map"}
        >
          {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          data-testid={`button-delete-group-${group.id}`}
          onClick={onDelete}
          className="p-0.5 text-muted-foreground hover:text-red-400 transition-colors"
          title="Delete group"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <div className="px-2 py-1">
          {!features?.length ? (
            <p className="text-[10px] text-muted-foreground py-1">No saved features</p>
          ) : (
            features.map(f => (
              <div key={f.id} className="flex items-center gap-1.5 py-0.5">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: f.color, opacity: f.opacity }}
                />
                <span className="text-[10px] text-muted-foreground flex-1 truncate">
                  {f.featureType}
                </span>
                <button
                  data-testid={`button-delete-feature-${f.id}`}
                  onClick={() => onDeleteFeature(f.id)}
                  className="p-0.5 text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
