import { desc, eq } from "drizzle-orm";

import { terms } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListTermsResult } from "../types";
import { toTermListItem } from "../utils/to-term-list-item";

export async function listTerms(
  _params: Record<string, never>,
  ctx: WorkspaceContext,
): Promise<ListTermsResult> {
  const rows = await db
    .select()
    .from(terms)
    .where(eq(terms.workspaceId, ctx.workspaceId))
    .orderBy(desc(terms.createdAt));

  return {
    items: rows.map((row) => toTermListItem(row)),
  };
}
