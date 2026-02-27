import { useState, useEffect } from "react";
import { Shield, X } from "lucide-react";

const DATA_SOURCES = [
  "OpenStreetMap & Overpass API (Infrastructure & Military)",
  "Esri (Satellite & Hybrid Imagery)",
  "USGS (Topography, Protected Lands & Seismic Data)",
  "NASA FIRMS & EONET (Active Hazards & Fires)",
  "OpenSky Network (Aviation)",
  "AISStream.io (Marine Traffic)",
  "GDACS (Global Disasters)",
  "OpenAIP (Airspace)",
  "TeleGeography (Submarine Cables)",
];

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("iaware_welcomed");
    if (!seen) {
      setOpen(true);
    }
  }, []);

  const handleGuest = () => {
    localStorage.setItem("iaware_welcomed", "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      data-testid="welcome-modal-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div
        data-testid="welcome-modal"
        className="relative w-full max-w-md rounded-xl border border-[hsl(215,15%,16%)] shadow-2xl overflow-hidden"
        style={{ backgroundColor: "hsl(220,18%,7%)" }}
      >
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-5 h-5 text-[hsl(195,90%,48%)]" />
            <h1
              data-testid="text-welcome-title"
              className="text-lg font-mono font-bold tracking-widest uppercase text-[hsl(195,90%,48%)]"
            >
              iAware OSINT Visualizer
            </h1>
          </div>
          <p className="text-xs text-[hsl(215,10%,55%)] leading-relaxed mt-2 mb-6">
            A streamlined platform to visualize real-time environments, monitor global events, and build custom overlays for tactical and personal awareness.
          </p>

          <div className="space-y-3 mb-6">
            <button
              data-testid="button-browse-guest"
              onClick={handleGuest}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: "hsl(195, 90%, 48%)",
                color: "hsl(220, 25%, 5%)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(195, 90%, 56%)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(195, 90%, 48%)")}
            >
              Browse Anonymously as Guest
            </button>
            <a
              data-testid="button-login-welcome"
              href="/api/login"
              className="block w-full py-2.5 rounded-lg text-sm font-medium text-center border border-[hsl(215,15%,20%)] text-[hsl(200,15%,72%)] transition-all duration-200 hover:border-[hsl(195,90%,48%)] hover:text-[hsl(195,90%,48%)]"
            >
              Login with Replit
            </a>
          </div>
        </div>

        <div
          className="border-t border-[hsl(215,15%,12%)] px-6 py-4"
          style={{ backgroundColor: "hsl(220,18%,5%)" }}
        >
          <p className="text-[10px] uppercase tracking-widest text-[hsl(215,10%,40%)] mb-2 font-mono">
            Data Sources &amp; Attribution
          </p>
          <div
            data-testid="data-sources-list"
            className="space-y-1 max-h-36 overflow-y-auto pr-1"
            style={{ scrollbarWidth: "thin" }}
          >
            {DATA_SOURCES.map((src) => (
              <div key={src} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "hsl(195,90%,48%)" }} />
                <span className="text-[11px] text-[hsl(215,10%,48%)] leading-relaxed">{src}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
