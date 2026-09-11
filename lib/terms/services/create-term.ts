import { eq } from "drizzle-orm";

import { terms } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { TERM_CREATED_BY } from "../term-config";
import type { CreateTermParams, CreateTermResult } from "../types";
import { assertUniqueTermName } from "../utils/assert-unique-term-name";
import { normalizeTermDescription } from "../utils/normalize-term-description";
import { toTermListItem } from "../utils/to-term-list-item";

export async function createTerm(
  params: CreateTermParams,
  ctx: WorkspaceContext,
): Promise<CreateTermResult> {
  const name = params.name.trim();
  const description = normalizeTermDescription(params.description) ?? null;

  await assertUniqueTermName(ctx.workspaceId, name);

  const [term] = await db
    .insert(terms)
    .values({
      workspaceId: ctx.workspaceId,
      name,
      description,
      createdBy: TERM_CREATED_BY.admin,
    })
    .returning();

  if (!term) {
    throw new CreateFailedError("term");
  }

  return toTermListItem(term);
}
