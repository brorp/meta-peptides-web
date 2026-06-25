import { errorResponse } from "@/lib/api-response";
import {
  getAdminSessionFromCookies,
  type AdminRole,
} from "@/lib/admin-auth";

export async function requireAdminApiSession(
  allowedRoles: AdminRole[] = ["root", "admin"],
) {
  const role = await getAdminSessionFromCookies();

  if (!role) {
    return {
      role: null,
      response: errorResponse("Unauthorized", 401),
    };
  }

  if (!allowedRoles.includes(role)) {
    return {
      role,
      response: errorResponse("Forbidden", 403),
    };
  }

  return {
    role,
    response: null,
  };
}
