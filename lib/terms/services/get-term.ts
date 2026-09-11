import { and, eq } from "drizzle-orm";

import { documents, termBackfillRuns, terms } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { toTermBackfillRunItem } from "@/lib/term-backfill/utils/to-term-backfill-run-item";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { GetTermParams, GetTermResult } from "../types";
import { toTermListItem } from "../utils/to-term-list-item";

export async function getTerm(
  params: GetTermParams,
  ctx: WorkspaceContext,
): Promise<GetTermResult> {
  const [row] = await db
    .select({
      term: terms,
      sourceDocumentId: documents.id,
      sourceDocumentTitle: documents.title,
      sourceDocumentSourceName: documents.sourceName,
      sourceDocumentSourceId: documents.sourceId,
    })
    .from(terms)
    .leftJoin(documents, eq(terms.sourceDocumentId, documents.id))
    .where(
      and(eq(terms.id, params.id), eq(terms.workspaceId, ctx.workspaceId)),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("term", params.id);
  }

  const item = toTermListItem(row.term);

  let activeBackfillRun = null;

  if (row.term.activeBackfillRunId) {
    const [run] = await db
      .select()
      .from(termBackfillRuns)
      .where(eq(termBackfillRuns.id, row.term.activeBackfillRunId))
      .limit(1);

    if (run) {
      activeBackfillRun = toTermBackfillRunItem(run);
    }
  }

  return {
    ...item,
    sourceDocument: row.sourceDocumentId
      ? {
          id: row.sourceDocumentId,
          title: row.sourceDocumentTitle,
          sourceName: row.sourceDocumentSourceName ?? "",
          sourceId: row.sourceDocumentSourceId ?? "",
        }
      : null,
    activeBackfillRun,
  };
}
