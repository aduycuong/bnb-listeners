import { workspaceMembers, workspaces } from "@/db/schema";
import { db } from "@/lib/db";

import type { CreateWorkspaceParams, CreateWorkspaceResult } from "../types";
import { resolveUniqueWorkspaceSlug } from "../utils/resolve-unique-workspace-slug";
import { slugifyTitle } from "../utils/slugify-title";

export async function createWorkspace(
  params: CreateWorkspaceParams,
): Promise<CreateWorkspaceResult> {
  const name = params.name.trim();
  const slugInput = params.slug?.trim();
  const slugBase = slugInput ? slugifyTitle(slugInput) : slugifyTitle(name);
  const slug = slugBase ? await resolveUniqueWorkspaceSlug(slugBase) : null;

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name,
      slug,
      ownerUserId: params.userId,
    })
    .returning({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
    });

  if (!workspace) {
    throw new Error("Failed to create workspace.");
  }

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: params.userId,
    permission: "owner",
    grantedBy: params.userId,
  });

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    message: "Workspace created.",
  };
}
