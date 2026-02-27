import { Shield, Plane, AlertTriangle, Map } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[hsl(220,20%,4%)] text-[hsl(200,15%,82%)] flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[hsl(215,15%,12%)]" style={{ backgroundColor: "hsla(220, 20%, 4%, 0.85)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[hsl(195,90%,48%)]" />
            <span className="font-mono text-sm font-semibold tracking-widest uppercase text-[hsl(195,90%,48%)]">
              OSINT Tactical Map
            </span>
          </div>
          <a
            href="/api/login"
            data-testid="button-login"
            className="px-5 py-2 rounded-md text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: "hsl(195, 90%, 48%)",
              color: "hsl(220, 25%, 5%)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(195, 90%, 55%)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(195, 90%, 48%)")}
          >
            Sign In
          </a>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-20">
        <div className="max-w-3xl text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-white leading-tight">
            Real-Time Situational
            <br />
            <span style={{ color: "hsl(195, 90%, 48%)" }}>Awareness</span>
          </h1>
          <p className="text-lg text-[hsl(215,10%,48%)] mb-10 max-w-xl mx-auto leading-relaxed">
            Monitor live aviation traffic, natural hazards, surveillance infrastructure, and geographic intelligence — all on a single tactical dashboard.
          </p>
          <a
            href="/api/login"
            data-testid="button-get-started"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-md text-base font-medium transition-all duration-200"
            style={{
              backgroundColor: "hsl(195, 90%, 48%)",
              color: "hsl(220, 25%, 5%)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(195, 90%, 55%)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(195, 90%, 48%)")}
          >
            Get Started
          </a>
        </div>

        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {[
            {
              icon: <Plane className="w-5 h-5" />,
              title: "Live Aviation",
              desc: "Track aircraft in real-time with OpenSky Network data, including altitude, speed, and heading.",
            },
            {
              icon: <AlertTriangle className="w-5 h-5" />,
              title: "Hazard Monitoring",
              desc: "Stay informed about active wildfires and severe storms via NASA EONET feeds.",
            },
            {
              icon: <Map className="w-5 h-5" />,
              title: "Multi-Layer Intel",
              desc: "Toggle between railway, transport, surveillance, and Wikipedia overlays for complete awareness.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-[hsl(215,15%,12%)] p-6"
              style={{ backgroundColor: "hsla(220, 18%, 8%, 0.7)" }}
            >
              <div className="mb-3" style={{ color: "hsl(195, 90%, 48%)" }}>
                {feature.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-xs leading-relaxed text-[hsl(215,10%,48%)]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[hsl(215,15%,12%)] py-6 text-center">
        <span className="text-[10px] font-mono tracking-widest uppercase text-[hsl(215,10%,30%)]">
          OSINT TACTICAL MAP
        </span>
      </footer>
    </div>
  );
}
