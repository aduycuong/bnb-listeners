import { and, eq } from "drizzle-orm";

import { documents } from "@/db/schema";
import { db } from "@/lib/db";

import { DISCUSSION_DOC_TYPE } from "../config";

export async function findDiscussionDocumentId(params: {
  workspaceId: string;
  sourceOriginKey: string;
  sourceItemId: string;
}): Promise<string | null> {
  const [discussion] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.workspaceId, params.workspaceId),
        eq(documents.docType, DISCUSSION_DOC_TYPE),
        eq(documents.sourceOriginKey, params.sourceOriginKey),
        eq(documents.sourceItemId, params.sourceItemId),
      ),
    )
    .limit(1);

  return discussion?.id ?? null;
}
