import { and, eq, ne } from "drizzle-orm";

import { documents } from "@/db/schema";
import { db } from "@/lib/db";

import { DISCUSSION_DOC_TYPE } from "../config";

export async function resolveDiscussionParentDocumentId(params: {
  workspaceId: string;
  docType: string;
  sourceOriginKey: string;
  sourceItemId: string;
  metadata: unknown;
}): Promise<string | null> {
  if (params.docType !== DISCUSSION_DOC_TYPE) {
    return null;
  }

  const metadata = params.metadata;
  if (
    metadata &&
    typeof metadata === "object" &&
    "parentDocumentId" in metadata &&
    typeof metadata.parentDocumentId === "string"
  ) {
    return metadata.parentDocumentId;
  }

  const [parent] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.workspaceId, params.workspaceId),
        ne(documents.docType, DISCUSSION_DOC_TYPE),
        eq(documents.sourceOriginKey, params.sourceOriginKey),
        eq(documents.sourceItemId, params.sourceItemId),
      ),
    )
    .limit(1);

  return parent?.id ?? null;
}
