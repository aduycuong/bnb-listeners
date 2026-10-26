import { and, eq } from "drizzle-orm";

import { workspaceApiKeys } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { UpdateWorkspaceKeyParams, WorkspaceApiKeyItem } from "../types";
import { assertKeyProjects } from "../utils/assert-key-projects";
import { toWorkspaceKeyItem } from "../utils/to-workspace-key-item";

/** Renames a key or changes its scopes and projects; the key itself stays the same (D27). */
export async function updateWorkspaceKey(
  params: UpdateWorkspaceKeyParams,
): Promise<{ key: WorkspaceApiKeyItem; message: string }> {
  await assertKeyProjects(params.workspaceId, params.projectIds);
  const [row] = await db
    .update(workspaceApiKeys)
    .set({ name: params.name, scopes: params.scopes, projectIds: params.projectIds })
    .where(
      and(
        eq(workspaceApiKeys.id, params.keyId),
        eq(workspaceApiKeys.workspaceId, params.workspaceId),
      ),
    )
    .returning();
  if (!row) throw new NotFoundError("API key", params.keyId);

  return { key: toWorkspaceKeyItem(row, null), message: "Đã lưu key." };
}
