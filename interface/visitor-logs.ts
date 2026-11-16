import type { VisitorGeo } from "@/lib/visitor-ip-core";
export type VisitorIp = {
  id: string;
  ip_address: string;
  first_seen_at: string;
  hostnames: string[];
  entry_path: string;
  geo: VisitorGeo;
  geo_status: "pending" | "ready" | "unavailable";
  geo_source: string | null;
  geo_checked_at: string | null;
  visitor_ip_devices?: Array<{ count: number }>;
  visitor_ip_identities?: Array<{ count: number }>;
};
export type VisitorDevice = {
  id: string;
  first_seen_at: string;
  hostname: string;
  metadata: {
    user_agent: string;
    device_type: string;
    browser: string;
    browser_version: string;
    os: string;
    model: string;
    platform: string;
    language: string;
    is_bot: boolean;
    referer: string | null;
  };
};
export type VisitorIdentity = {
  id: string;
  user_id: string;
  is_guest: boolean;
  first_seen_at: string;
  source: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  checkout_contacts: Array<{
    id: string;
    shipping_name: string | null;
    shipping_phone: string | null;
    shipping_email: string | null;
    created_at: string;
  }>;
};
export type VisitorDetail = {
  ip: VisitorIp;
  devices: VisitorDevice[];
  device_count: number;
  identities: VisitorIdentity[];
  identity_count: number;
};
export type VisitorList = {
  items: VisitorIp[];
  pagination: { page: number; total: number; total_pages: number };
};
