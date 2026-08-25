import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { users } from "@/db/schema";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { deriveRoleFromCustomClaims } from "@/lib/auth/utils/derive-role-from-custom-claims";
import { db } from "@/lib/db";
import { getAdminAuth } from "@/lib/firebase/admin";
import { createDefaultWorkspaceForUser } from "@/lib/workspaces/services/create-default-workspace-for-user";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role?: string;
};

export async function getSession(): Promise<SessionUser | null> {
  const admin = getAdminAuth();
  if (!admin) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const decoded = await admin.verifyIdToken(token);
    const role = deriveRoleFromCustomClaims(decoded);

    let user = await getDbUserByFirebaseUid(decoded.uid);

    if (!user) {
      user = await upsertUserFromToken({
        uid: decoded.uid,
        email: decoded.email,
        name: (decoded as { name?: string }).name,
        picture: (decoded as { picture?: string }).picture,
        role,
      });
    }

    return user ? { ...user, role: role ?? user.role } : null;
  } catch {
    return null;
  }
}

export async function getSessionFromToken(
  token: string,
): Promise<SessionUser | null> {
  const admin = getAdminAuth();
  if (!admin) return null;

  try {
    const decoded = await admin.verifyIdToken(token);
    const role = deriveRoleFromCustomClaims(decoded);
    return upsertUserFromToken({
      uid: decoded.uid,
      email: decoded.email,
      name: (decoded as { name?: string }).name,
      picture: (decoded as { picture?: string }).picture,
      role,
    });
  } catch {
    return null;
  }
}

export async function getDbUserByFirebaseUid(
  firebaseUid: string,
): Promise<SessionUser | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.firebaseUid, firebaseUid))
    .limit(1);

  return row
    ? {
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      }
    : null;
}

async function upsertUserFromToken(decoded: {
  uid: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  role?: string;
}) {
  const email = decoded.email?.trim() || `${decoded.uid}@anonymous.local`;

  const [row] = await db
    .insert(users)
    .values({
      firebaseUid: decoded.uid,
      email,
      displayName: decoded.name ?? null,
      avatarUrl: decoded.picture ?? null,
    })
    .onConflictDoUpdate({
      target: users.firebaseUid,
      set: {
        email,
        displayName: decoded.name ?? null,
        avatarUrl: decoded.picture ?? null,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    });

  if (row) {
    await createDefaultWorkspaceForUser({
      userId: row.id,
      displayName: row.displayName,
    });
  }

  return row
    ? {
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        role: decoded.role,
      }
    : null;
}
