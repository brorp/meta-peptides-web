import { headers } from "next/headers";

/**
 * Helper
 */
export async function getIdentity() {
  const head = await headers();
  const userId = head.get("x-user-id");
  const role = head.get("x-user-role");

  if (!userId) throw new Error("Unauthorized");

  return { userId, role };
}
