import { and, desc, eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListTopicsParams, ListTopicsResult } from "../types";
import { toTopicListItem } from "../utils/to-topic-list-item";

export async function listTopics(
  params: ListTopicsParams,
  ctx: WorkspaceContext,
): Promise<ListTopicsResult> {
  const conditions = [eq(topics.workspaceId, ctx.workspaceId)];

  if (params.verified !== undefined) {
    conditions.push(eq(topics.verified, params.verified));
  }

  const rows = await db
    .select()
    .from(topics)
    .where(and(...conditions))
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
