import { and, eq } from "drizzle-orm";

import { dataSourceGroups } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  DeleteDataSourceGroupParams,
  DeleteDataSourceGroupResult,
} from "../types";

export async function deleteDataSourceGroup(
  params: DeleteDataSourceGroupParams,
  ctx: WorkspaceContext,
): Promise<DeleteDataSourceGroupResult> {
  const [deleted] = await db
    .delete(dataSourceGroups)
    .where(
      and(
        eq(dataSourceGroups.id, params.id),
        eq(dataSourceGroups.workspaceId, ctx.workspaceId),
      ),
    )
    .returning({ id: dataSourceGroups.id, name: dataSourceGroups.name });

  if (!deleted) {
    throw new NotFoundError("data source group", params.id);
  }

  return {
    id: deleted.id,
    message: `Data source group “${deleted.name}” deleted successfully.`,
  };
}
