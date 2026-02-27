import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";

export default function MapDrawTools() {
  const map = useMap();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

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
            color: "#00d4ff",
            weight: 2,
            opacity: 0.9,
          },
        },
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: "#00d4ff",
            weight: 2,
            fillOpacity: 0.15,
          },
        },
        rectangle: {
          shapeOptions: {
            color: "#00d4ff",
            weight: 2,
            fillOpacity: 0.15,
          },
        },
        circle: {
          shapeOptions: {
            color: "#00d4ff",
            weight: 2,
            fillOpacity: 0.15,
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
      drawnItems.addLayer(e.layer);
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

  return null;
}
