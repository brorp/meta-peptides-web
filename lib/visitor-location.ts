import { z } from "zod";

export const LOCATION_FRESH_MS = 45_000;
export const LOCATION_REFRESH_MS = 10_000;
export const LOCATION_SEND_MS = 5_500;
export const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20_000,
} as const;

export const visitorLocationInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("start"), consent: z.literal(true) }).strict(),
  z.object({
    mode: z.literal("update"),
    session_id: z.string().uuid(),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracy_m: z.number().finite().min(0).max(20_000_000),
    observed_at: z.iso.datetime(),
  }).strict(),
  z.object({ mode: z.enum(["pause", "stop"]), session_id: z.string().uuid() }).strict(),
]);
export type VisitorLocation = {
  session_id: string;
  ip_id: string;
  device_key: string;
  hostname: string;
  latitude: number;
  longitude: number;
  accuracy_m: number;
  observed_at: string;
  received_at: string;
  consented_at: string;
  sharing: boolean;
  ended_at: string | null;
  device?: { metadata: { browser: string; os: string; device_type: string } } | null;
};
export type VisitorLocationSummary = Pick<VisitorLocation, "session_id" | "accuracy_m" | "observed_at" | "received_at" | "sharing" | "ended_at">;
export function locationIsFresh(location: VisitorLocationSummary, now = Date.now()) {
  const age = now - Date.parse(location.observed_at);
  const receivedAge = now - Date.parse(location.received_at);
  return location.sharing && !location.ended_at && age >= -30_000 && age <= LOCATION_FRESH_MS
    && receivedAge >= -30_000 && receivedAge <= LOCATION_FRESH_MS;
}
export function locationAccuracy(meters: number) {
  return meters >= 1000 ? `±${(meters / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`
    : `±${Math.ceil(meters).toLocaleString("id-ID")} m`;
}
