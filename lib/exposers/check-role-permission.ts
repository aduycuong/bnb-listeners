import type { SessionUser } from "@/lib/auth";

import { APIError } from "./api-error";

export type AllowedRoles = ("*" | "admin" | "user" | "anonymous" | string)[];

export function checkRolePermission(
  session: SessionUser | null,
  allowedRoles: AllowedRoles,
): void {
  const role = session ? (session.role ?? "user") : "anonymous";

  if (!allowedRoles.includes("*") && !allowedRoles.includes(role)) {
    throw new APIError("Unauthorized", "Invalid or expired token", 401);
  }
}
