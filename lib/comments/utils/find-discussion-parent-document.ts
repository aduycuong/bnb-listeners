import { and, eq, ne } from "drizzle-orm";

import { documents, type Document } from "@/db/schema";
import { db } from "@/lib/db";

import { DISCUSSION_DOC_TYPE } from "../config";

export type DiscussionParentDocument = Pick<
  Document,
  "id" | "title" | "rawContent"
>;

/**
 * Single-query lookup of a discussion's parent post. Returns null when the
 * document is not a discussion. Prefers `metadata.parentDocumentId` and falls
 * back to matching the non-discussion sibling by source origin/item.
 */
export async function findDiscussionParentDocument(params: {
  workspaceId: string;
  docType: string;
  sourceOriginKey: string;
  sourceItemId: string;
  metadata: unknown;
}): Promise<DiscussionParentDocument | null> {
  if (params.docType !== DISCUSSION_DOC_TYPE) {
    return null;
  }

  const metadata = params.metadata;
  const metadataParentId =
    metadata &&
    typeof metadata === "object" &&
    "parentDocumentId" in metadata &&
    typeof metadata.parentDocumentId === "string"
      ? metadata.parentDocumentId
      : null;

  const where = metadataParentId
    ? eq(documents.id, metadataParentId)
    : and(
        eq(documents.workspaceId, params.workspaceId),
        ne(documents.docType, DISCUSSION_DOC_TYPE),
        eq(documents.sourceOriginKey, params.sourceOriginKey),
        eq(documents.sourceItemId, params.sourceItemId),
      );

  const [parent] = await db
    .select({
      id: documents.id,
      title: documents.title,
      rawContent: documents.rawContent,
    })
    .from(documents)
    .where(where)
    .limit(1);

  return parent ?? null;
}
