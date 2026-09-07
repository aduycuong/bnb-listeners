import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type {
  UpdateWorkspaceGeneralParams,
  UpdateWorkspaceGeneralResult,
} from "../types";
import { resolveUniqueWorkspaceSlug } from "../utils/resolve-unique-workspace-slug";
import { slugifyTitle } from "../utils/slugify-title";

export async function updateWorkspaceGeneral(
  params: UpdateWorkspaceGeneralParams,
): Promise<UpdateWorkspaceGeneralResult> {
  const name = params.name.trim();
  const slugInput = params.slug?.trim();
  const slugBase = slugInput ? slugifyTitle(slugInput) : slugifyTitle(name);
  const slug = slugBase
    ? await resolveUniqueWorkspaceSlug(slugBase, params.workspaceId)
    : null;

  const [workspace] = await db
    .update(workspaces)
    .set({
      name,
      slug,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, params.workspaceId))
    .returning({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      updatedAt: workspaces.updatedAt,
    });

  if (!workspace) {
    throw new NotFoundError("workspace", params.workspaceId);
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    updatedAt: workspace.updatedAt.toISOString(),
    message: "Workspace updated.",
  };
}
