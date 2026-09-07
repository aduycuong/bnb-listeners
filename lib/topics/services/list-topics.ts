import { desc, eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListTopicsResult } from "../types";
import { toTopicListItem } from "../utils/to-topic-list-item";

export async function listTopics(
  _params: Record<string, never>,
  ctx: WorkspaceContext,
): Promise<ListTopicsResult> {
  const rows = await db
    .select()
    .from(topics)
    .where(eq(topics.workspaceId, ctx.workspaceId))
    .orderBy(desc(topics.createdAt));

  const nameById = new Map(rows.map((row) => [row.id, row.name]));

  return {
    items: rows.map((row) =>
      toTopicListItem(
        row,
        row.parentId ? (nameById.get(row.parentId) ?? null) : null,
      ),
    ),
  };
}
