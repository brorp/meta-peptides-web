import { errorResponse } from "./api-response";
import { createClientCookies } from "./supabase-server";

export function withAuth(handler: Function) {
  return async (request: Request) => {
    const supabase = await createClientCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse("Access Denied: No session found", 401);
    }

    return handler(request, user);
  };
}
