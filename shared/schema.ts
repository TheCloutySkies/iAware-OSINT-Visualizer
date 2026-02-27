import { z } from "zod";

export interface FlightData {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  trueTrack: number | null;
  verticalRate: number | null;
  geoAltitude: number | null;
}

export interface HazardEvent {
  id: string;
  title: string;
  description: string;
  categories: { id: string; title: string }[];
  geometry: { date: string; type: string; coordinates: number[] }[];
}

export interface WikiArticle {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
}

export interface SurveillanceCamera {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export interface MarineVessel {
  mmsi: number;
  name: string;
  latitude: number;
  longitude: number;
  cog: number;
  sog: number;
  heading: number;
  shipType: number;
  timestamp: string;
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface ApiHealthStatus {
  aviation: "green" | "yellow" | "red";
  hazards: "green" | "yellow" | "red";
  wikipedia: "green" | "yellow" | "red";
  surveillance: "green" | "yellow" | "red";
}

export const boundingBoxSchema = z.object({
  south: z.coerce.number(),
  west: z.coerce.number(),
  north: z.coerce.number(),
  east: z.coerce.number(),
});

export const geoSearchSchema = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  radius: z.coerce.number().optional().default(10000),
});

export const reverseGeocodeSchema = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
});
