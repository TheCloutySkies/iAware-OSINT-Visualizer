import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import {
  boundingBoxSchema,
  geoSearchSchema,
  reverseGeocodeSchema,
  type FlightData,
  type HazardEvent,
  type WikiArticle,
  type SurveillanceCamera,
  type ApiHealthStatus,
} from "@shared/schema";
import { groups, savedFeatures } from "@shared/models/auth";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const SCRUBBED_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const apiStatus: ApiHealthStatus = {
  aviation: "yellow",
  hazards: "yellow",
  wikipedia: "yellow",
  surveillance: "yellow",
  gdacs: "yellow",
  cables: "yellow",
};

function stripTrackingHeaders(req: Request) {
  delete req.headers["x-forwarded-for"];
  delete req.headers["forwarded"];
  delete req.headers["via"];
  delete req.headers["x-real-ip"];
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/api", (req: Request, _res: Response, next: NextFunction) => {
    stripTrackingHeaders(req);
    next();
  });

  app.get("/api/aviation", async (req, res) => {
    try {
      const parsed = boundingBoxSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.json([]);
      }
      const { south, west, north, east } = parsed.data;
      const url = `https://opensky-network.org/api/states/all?lamin=${south}&lomin=${west}&lamax=${north}&lomax=${east}`;
      const response = await fetch(url, {
        headers: { "User-Agent": SCRUBBED_USER_AGENT },
      });
      if (!response.ok) {
        apiStatus.aviation = "red";
        return res.json([]);
      }
      const data = await response.json();
      apiStatus.aviation = "green";
      if (!data.states) {
        return res.json([]);
      }
      const flights: FlightData[] = data.states.map((s: any[]) => ({
        icao24: s[0],
        callsign: s[1]?.trim() || null,
        originCountry: s[2],
        longitude: s[5],
        latitude: s[6],
        baroAltitude: s[7],
        onGround: s[8],
        velocity: s[9],
        trueTrack: s[10],
        verticalRate: s[11],
        geoAltitude: s[13],
      }));
      return res.json(flights);
    } catch {
      apiStatus.aviation = "red";
      return res.json([]);
    }
  });

  app.get("/api/hazards", async (_req, res) => {
    try {
      const url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open";
      const response = await fetch(url, {
        headers: { "User-Agent": SCRUBBED_USER_AGENT },
      });
      if (!response.ok) {
        apiStatus.hazards = "red";
        return res.json([]);
      }
      const data = await response.json();
      apiStatus.hazards = "green";
      const events: HazardEvent[] = (data.events || [])
        .filter((e: any) =>
          e.categories?.some((c: any) =>
            ["wildfires", "severeStorms"].includes(c.id)
          )
        )
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description || "",
          categories: e.categories,
          geometry: e.geometry,
        }));
      return res.json(events);
    } catch {
      apiStatus.hazards = "red";
      return res.json([]);
    }
  });

  app.get("/api/wikipedia", async (req, res) => {
    try {
      const parsed = geoSearchSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.json([]);
      }
      const { lat, lon, radius } = parsed.data;
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=50&format=json`;
      const response = await fetch(url, {
        headers: { "User-Agent": SCRUBBED_USER_AGENT },
      });
      if (!response.ok) {
        apiStatus.wikipedia = "red";
        return res.json([]);
      }
      const data = await response.json();
      apiStatus.wikipedia = "green";
      const articles: WikiArticle[] = (data.query?.geosearch || []).map(
        (a: any) => ({
          pageid: a.pageid,
          title: a.title,
          lat: a.lat,
          lon: a.lon,
          dist: a.dist,
        })
      );
      return res.json(articles);
    } catch {
      apiStatus.wikipedia = "red";
      return res.json([]);
    }
  });

  app.get("/api/surveillance", async (req, res) => {
    try {
      const parsed = boundingBoxSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.json([]);
      }
      const { south, west, north, east } = parsed.data;
      const query = `[out:json][timeout:10];node["man_made"="surveillance"](${south},${west},${north},${east});out body;`;
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": SCRUBBED_USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) {
        apiStatus.surveillance = "red";
        return res.json([]);
      }
      const data = await response.json();
      apiStatus.surveillance = "green";
      const cameras: SurveillanceCamera[] = (data.elements || []).map(
        (el: any) => ({
          id: el.id,
          lat: el.lat,
          lon: el.lon,
          tags: el.tags || {},
        })
      );
      return res.json(cameras);
    } catch {
      apiStatus.surveillance = "red";
      return res.json([]);
    }
  });

  app.get("/api/reverse-geocode", async (req, res) => {
    try {
      const parsed = reverseGeocodeSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.json({ error: "Invalid parameters" });
      }
      const { lat, lon } = parsed.data;
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
      const response = await fetch(url, {
        headers: { "User-Agent": SCRUBBED_USER_AGENT },
      });
      if (!response.ok) {
        return res.json({ error: "Geocoding failed" });
      }
      const data = await response.json();
      return res.json({
        zipCode: data.address?.postcode || null,
        display_name: data.display_name || null,
        address: data.address || {},
      });
    } catch {
      return res.json({ error: "Geocoding failed" });
    }
  });

  app.get("/api/gdacs", async (_req, res) => {
    try {
      const url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=&fromDate=" +
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] +
        "&toDate=" + new Date().toISOString().split("T")[0] +
        "&alertlevel=&eventtype=";
      const response = await fetch(url, {
        headers: {
          "User-Agent": SCRUBBED_USER_AGENT,
          "Accept": "application/json",
        },
      });
      if (!response.ok) {
        apiStatus.gdacs = "red";
        return res.json({ type: "FeatureCollection", features: [] });
      }
      const data = await response.json();
      apiStatus.gdacs = "green";
      return res.json(data);
    } catch {
      apiStatus.gdacs = "red";
      return res.json({ type: "FeatureCollection", features: [] });
    }
  });

  app.get("/api/submarine-cables", async (_req, res) => {
    try {
      const url = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json";
      const response = await fetch(url, {
        headers: { "User-Agent": SCRUBBED_USER_AGENT },
      });
      if (!response.ok) {
        apiStatus.cables = "red";
        return res.json({ type: "FeatureCollection", features: [] });
      }
      const data = await response.json();
      apiStatus.cables = "green";
      return res.json(data);
    } catch {
      apiStatus.cables = "red";
      return res.json({ type: "FeatureCollection", features: [] });
    }
  });

  const createGroupSchema = z.object({ name: z.string().min(1).max(255) });
  const createFeatureSchema = z.object({
    groupId: z.number().int().positive(),
    featureType: z.string().min(1).max(50),
    geojsonData: z.string(),
    color: z.string().max(20).default("#00d4ff"),
    opacity: z.number().min(0.1).max(1.0).default(0.8),
  });

  function getUserHash(req: Request): string | null {
    const user = (req as any).user;
    return user?.claims?.sub || null;
  }

  app.get("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserHash(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const result = await db.select().from(groups).where(eq(groups.userId, userId));
      return res.json(result);
    } catch {
      return res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserHash(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const parsed = createGroupSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid group name" });
      const [group] = await db.insert(groups).values({ userId, name: parsed.data.name }).returning();
      return res.json(group);
    } catch {
      return res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.delete("/api/groups/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserHash(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID" });
      await db.delete(groups).where(and(eq(groups.id, groupId), eq(groups.userId, userId)));
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ message: "Failed to delete group" });
    }
  });

  app.get("/api/groups/:id/features", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserHash(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID" });
      const [group] = await db.select().from(groups).where(and(eq(groups.id, groupId), eq(groups.userId, userId)));
      if (!group) return res.status(404).json({ message: "Group not found" });
      const features = await db.select().from(savedFeatures).where(eq(savedFeatures.groupId, groupId));
      return res.json(features);
    } catch {
      return res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  app.post("/api/features", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserHash(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const parsed = createFeatureSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid feature data" });
      const [group] = await db.select().from(groups).where(and(eq(groups.id, parsed.data.groupId), eq(groups.userId, userId)));
      if (!group) return res.status(404).json({ message: "Group not found" });
      const [feature] = await db.insert(savedFeatures).values(parsed.data).returning();
      return res.json(feature);
    } catch {
      return res.status(500).json({ message: "Failed to save feature" });
    }
  });

  app.delete("/api/features/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserHash(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const featureId = parseInt(req.params.id);
      if (isNaN(featureId)) return res.status(400).json({ message: "Invalid feature ID" });
      const [feature] = await db.select().from(savedFeatures).where(eq(savedFeatures.id, featureId));
      if (!feature) return res.status(404).json({ message: "Feature not found" });
      const [group] = await db.select().from(groups).where(and(eq(groups.id, feature.groupId), eq(groups.userId, userId)));
      if (!group) return res.status(403).json({ message: "Forbidden" });
      await db.delete(savedFeatures).where(eq(savedFeatures.id, featureId));
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ message: "Failed to delete feature" });
    }
  });

  app.get("/api/military", async (req, res) => {
    try {
      const parsed = boundingBoxSchema.safeParse(req.query);
      if (!parsed.success) return res.json([]);
      const { south, west, north, east } = parsed.data;
      const query = `[out:json][timeout:15];(way["landuse"="military"](${south},${west},${north},${east});relation["landuse"="military"](${south},${west},${north},${east}););out geom;`;
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": SCRUBBED_USER_AGENT,
        },
      });
      if (!response.ok) return res.json([]);
      const data = await response.json();
      return res.json(data);
    } catch {
      return res.json([]);
    }
  });

  app.get("/api/health", async (_req, res) => {
    return res.json(apiStatus);
  });

  return httpServer;
}
