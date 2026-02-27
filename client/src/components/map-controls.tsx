import { useCallback, useState } from "react";
import { useMap } from "react-leaflet";
import { Crosshair, Camera, Radio, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MapControls() {
  const map = useMap();
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, { duration: 1.5 });
        setLocating(false);
        toast({ title: "Location found" });
      },
      () => {
        setLocating(false);
        toast({ title: "Unable to get location", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [map, toast]);

  const handleScreenshot = useCallback(async () => {
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const container = document.querySelector(".leaflet-container") as HTMLElement;
      if (!container) {
        toast({ title: "Map container not found", variant: "destructive" });
        setCapturing(false);
        return;
      }
      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: "#0a0f1a",
      });
      const link = document.createElement("a");
      link.download = `osint-map-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Screenshot saved" });
    } catch {
      toast({ title: "Screenshot failed", variant: "destructive" });
    }
    setCapturing(false);
  }, [toast]);

  const handlePoliceScanner = useCallback(() => {
    const center = map.getCenter();
    const url = `https://www.broadcastify.com/listen/?lat=${center.lat}&lon=${center.lng}`;
    window.open(url, "_blank");
  }, [map]);

  const handleRegistrySearch = useCallback(async () => {
    const center = map.getCenter();
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${center.lat}&lon=${center.lng}`);
      const data = await res.json();
      if (data.zipCode) {
        const url = `https://www.nsopw.gov/en/Search/Verification`;
        window.open(url, "_blank");
        toast({ title: `Zip code: ${data.zipCode}` });
      } else {
        toast({ title: "Could not determine zip code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Geocoding failed", variant: "destructive" });
    }
  }, [map, toast]);

  const btnClass =
    "flex items-center justify-center w-10 h-10 rounded-md border border-[hsl(215,15%,16%)] text-[hsl(200,15%,72%)] transition-all duration-150 disabled:opacity-40";

  return (
    <div
      data-testid="map-controls"
      className="absolute bottom-6 left-3 z-[1000] flex flex-col gap-2"
    >
      <button
        data-testid="button-locate-me"
        onClick={handleLocateMe}
        disabled={locating}
        className={btnClass}
        style={{ backgroundColor: "hsla(220, 18%, 8%, 0.92)", backdropFilter: "blur(12px)" }}
        title="Locate Me"
      >
        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
      </button>

      <button
        data-testid="button-screenshot"
        onClick={handleScreenshot}
        disabled={capturing}
        className={btnClass}
        style={{ backgroundColor: "hsla(220, 18%, 8%, 0.92)", backdropFilter: "blur(12px)" }}
        title="Screenshot"
      >
        {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
      </button>

      <button
        data-testid="button-police-scanner"
        onClick={handlePoliceScanner}
        className={btnClass}
        style={{ backgroundColor: "hsla(220, 18%, 8%, 0.92)", backdropFilter: "blur(12px)" }}
        title="Police Scanner"
      >
        <Radio className="w-4 h-4" />
      </button>

      <button
        data-testid="button-registry-search"
        onClick={handleRegistrySearch}
        className={btnClass}
        style={{ backgroundColor: "hsla(220, 18%, 8%, 0.92)", backdropFilter: "blur(12px)" }}
        title="Registry Lookup"
      >
        <Search className="w-4 h-4" />
      </button>
    </div>
  );
}
