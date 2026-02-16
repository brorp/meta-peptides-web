import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseClient } from "@/lib/supabase-client";

export async function GET() {
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return errorResponse("User tidak ditemukan atau belum login", 401);
  }

  // Jika butuh data tambahan dari tabel lain (misal: profiles)
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return successResponse({ user, profile }, "Data user berhasil diambil");
}
