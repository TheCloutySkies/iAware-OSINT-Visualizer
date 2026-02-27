import { useCallback, useState, useRef, useEffect } from "react";
import { useMap } from "react-leaflet";
import { Crosshair, Camera, Radio, Search, Loader2, Image, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

async function captureMap(toast: ReturnType<typeof useToast>["toast"]) {
  const html2canvas = (await import("html2canvas")).default;
  const container = document.querySelector(".leaflet-container") as HTMLElement;
  if (!container) {
    toast({ title: "Map container not found", variant: "destructive" });
    return null;
  }

  const uiSelectors = [
    "[data-testid='control-panel']",
    "[data-testid='map-controls']",
    "[data-testid='text-branding']",
    ".leaflet-control-zoom",
    ".leaflet-draw",
    ".leaflet-draw-toolbar",
    ".leaflet-control-attribution",
  ];

  const hidden: HTMLElement[] = [];
  uiSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style.display !== "none") {
        hidden.push(htmlEl);
        htmlEl.style.visibility = "hidden";
      }
    });
  });

  try {
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
      backgroundColor: "#0a0f1a",
    });
    return canvas;
  } finally {
    hidden.forEach((el) => {
      el.style.visibility = "";
    });
  }
}

export default function MapControls() {
  const map = useMap();
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [exportOpen]);

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

  const handleExportJpg = useCallback(async () => {
    setCapturing(true);
    setExportOpen(false);
    try {
      const canvas = await captureMap(toast);
      if (!canvas) { setCapturing(false); return; }
      const link = document.createElement("a");
      link.download = `osint-map-${Date.now()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
      toast({ title: "JPG exported" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
    setCapturing(false);
  }, [toast]);

  const handleExportPdf = useCallback(async () => {
    setCapturing(true);
    setExportOpen(false);
    try {
      const canvas = await captureMap(toast);
      if (!canvas) { setCapturing(false); return; }
      const { jsPDF } = await import("jspdf");
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgW = canvas.width;
      const imgH = canvas.height;
      const orientation = imgW > imgH ? "landscape" : "portrait";
      const doc = new jsPDF({ orientation, unit: "px", format: [imgW, imgH] });
      doc.addImage(imgData, "JPEG", 0, 0, imgW, imgH);
      doc.save(`osint-map-${Date.now()}.pdf`);
      toast({ title: "PDF exported" });
    } catch {
      toast({ title: "PDF export failed", variant: "destructive" });
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
  const btnStyle = { backgroundColor: "hsla(220, 18%, 8%, 0.92)", backdropFilter: "blur(12px)" };

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
        style={btnStyle}
        title="Locate Me"
      >
        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          data-testid="button-export"
          onClick={() => setExportOpen(!exportOpen)}
          disabled={capturing}
          className={btnClass}
          style={btnStyle}
          title="Export Map"
        >
          {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </button>

        {exportOpen && (
          <div
            className="absolute left-12 bottom-0 flex flex-col gap-1 rounded-md border border-[hsl(215,15%,16%)] p-1"
            style={{ backgroundColor: "hsla(220, 18%, 8%, 0.95)", backdropFilter: "blur(16px)", minWidth: "140px" }}
          >
            <button
              data-testid="button-export-jpg"
              onClick={handleExportJpg}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[hsl(200,15%,72%)] transition-colors"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsla(215, 15%, 16%, 0.6)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Image className="w-3.5 h-3.5" />
              Export JPG
            </button>
            <button
              data-testid="button-export-pdf"
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[hsl(200,15%,72%)] transition-colors"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsla(215, 15%, 16%, 0.6)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <FileText className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        )}
      </div>

      <button
        data-testid="button-police-scanner"
        onClick={handlePoliceScanner}
        className={btnClass}
        style={btnStyle}
        title="Police Scanner"
      >
        <Radio className="w-4 h-4" />
      </button>

      <button
        data-testid="button-registry-search"
        onClick={handleRegistrySearch}
        className={btnClass}
        style={btnStyle}
        title="Registry Lookup"
      >
        <Search className="w-4 h-4" />
      </button>
    </div>
  );
}
