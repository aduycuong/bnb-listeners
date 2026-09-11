import { and, eq } from "drizzle-orm";

import { terms } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { UpdateTermParams, UpdateTermResult } from "../types";
import { assertUniqueTermName } from "../utils/assert-unique-term-name";
import { normalizeTermDescription } from "../utils/normalize-term-description";
import { toTermListItem } from "../utils/to-term-list-item";

export async function updateTerm(
  params: UpdateTermParams,
  ctx: WorkspaceContext,
): Promise<UpdateTermResult> {
  const { id, ...rest } = params;

  const [existing] = await db
    .select()
    .from(terms)
    .where(and(eq(terms.id, id), eq(terms.workspaceId, ctx.workspaceId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("term", id);
  }

  const updates: Partial<typeof terms.$inferInsert> = {};

  if (rest.name !== undefined) {
    const name = rest.name.trim();
    await assertUniqueTermName(ctx.workspaceId, name, id);
    updates.name = name;
  }

  if (rest.description !== undefined) {
    updates.description = normalizeTermDescription(rest.description) ?? null;
  }

  const [term] = await db
    .update(terms)
    .set(updates)
    .where(and(eq(terms.id, id), eq(terms.workspaceId, ctx.workspaceId)))
    .returning();

  if (!term) {
    throw new NotFoundError("term", id);
  }

  return toTermListItem(term);
}
