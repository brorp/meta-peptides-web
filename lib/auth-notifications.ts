import { supabaseAdmin } from "./supabase-server";

export type VisitorMetadata = {
  ipAddress?: string | null;
  country?: string | null;
  userAgent?: string | null;
  referer?: string | null;
  origin?: string | null;
  language?: string | null;
  timezone?: string | null;
  platform?: string | null;
  screenSize?: string | null;
  viewport?: string | null;
  entryPath?: string | null;
};

export function getUserDisplayName(user: any): string {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Researcher"
  );
}

export function getProviderLabel(
  user: any,
  fallbackProvider?: string,
): string {
  if (user?.is_anonymous) {
    return "Guest / Anonymous";
  }

  const provider = String(
    user?.app_metadata?.provider || fallbackProvider || "email",
  ).toLowerCase();

  switch (provider) {
    case "google":
      return "Google";
    case "email":
      return "Email & Password";
    case "anonymous":
      return "Guest / Anonymous";
    default:
      return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}

export function buildVisitorMetadata(
  request: Request,
  overrides: Partial<VisitorMetadata> = {},
): VisitorMetadata {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  return {
    ipAddress,
    country:
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") ||
      null,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
    origin: new URL(request.url).origin,
    language: request.headers.get("accept-language"),
    timezone: null,
    platform: null,
    screenSize: null,
    viewport: null,
    entryPath: null,
    ...overrides,
  };
}

export async function ensureProfileExistsForUser(user: {
  id: string;
  email?: string | null;
}): Promise<boolean> {
  const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileLookupError) {
    throw new Error(profileLookupError.message);
  }

  if (existingProfile) {
    return false;
  }

  const { error: profileUpsertError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email?.toLowerCase() || null,
      },
      { onConflict: "id" },
    );

  if (profileUpsertError) {
    throw new Error(profileUpsertError.message);
  }

  return true;
}
