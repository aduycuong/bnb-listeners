import { eq } from "drizzle-orm";

import { workspaceMembers, workspaces } from "@/db/schema";
import { db } from "@/lib/db";

import { buildDefaultWorkspaceName } from "../utils/build-default-workspace-name";
import { resolveUniqueWorkspaceSlug } from "../utils/resolve-unique-workspace-slug";
import { slugifyTitle } from "../utils/slugify-title";

export async function createDefaultWorkspaceForUser(params: {
  userId: string;
  displayName?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const ownedWorkspaces = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerUserId, params.userId))
    .limit(1);

  if (ownedWorkspaces.length > 0) {
    return { id: ownedWorkspaces[0].id, created: false };
  }

  const name = buildDefaultWorkspaceName(params.displayName ?? null);
  const trimmedDisplayName = params.displayName?.trim();
  const slug = trimmedDisplayName
    ? await resolveUniqueWorkspaceSlug(slugifyTitle(name))
    : null;

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name,
      slug,
      ownerUserId: params.userId,
    })
    .returning({ id: workspaces.id });

  if (!workspace) {
    throw new Error("Failed to create default workspace.");
  }

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: params.userId,
    permission: "owner",
    grantedBy: params.userId,
  });

  return { id: workspace.id, created: true };
}
