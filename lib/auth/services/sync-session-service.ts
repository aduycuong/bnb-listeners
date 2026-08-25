import { cookies } from "next/headers";

import { getSessionFromToken } from "@/lib/auth/session";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

export async function syncSession(idToken: string): Promise<void> {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Invalid token");
  }

  const sessionUser = await getSessionFromToken(idToken);
  if (!sessionUser) {
    throw new Error("Invalid or expired token");
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}
