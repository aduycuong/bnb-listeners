import { asc, eq } from "drizzle-orm";

import { documentParts, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListDocumentPartsParams, ListDocumentPartsResult } from "../types";
import { toDocumentPartRow } from "../utils/to-document-part-row";

/** Lists a document's parts with scores, for the document detail UI. */
export async function listDocumentParts(
  params: ListDocumentPartsParams,
  ctx: WorkspaceContext,
): Promise<ListDocumentPartsResult> {
  const [doc] = await db
    .select({ id: documents.id, workspaceId: documents.workspaceId })
    .from(documents)
    .where(eq(documents.id, params.id))
    .limit(1);

  if (!doc || doc.workspaceId !== ctx.workspaceId) {
    throw new NotFoundError("document", params.id);
  }

  const rows = await db
    .select()
    .from(documentParts)
    .where(eq(documentParts.documentId, params.id))
    .orderBy(asc(documentParts.partIndex));

  const items = rows.map((row) => {
    const part = toDocumentPartRow(row);
    return {
      ...part,
      scoredAt: part.scoredAt ? part.scoredAt.toISOString() : null,
      createdAt: part.createdAt.toISOString(),
    };
  });

  return {
    items,
    total: items.length,
    eligibleCount: items.filter((item) => item.isEligible).length,
  };
}
