import { eq } from "drizzle-orm";

import { documentParts, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { deleteObjectsFromR2 } from "@/lib/r2/services/delete-objects-from-r2";

import type {
  RebuildDocumentPartsParams,
  RebuildDocumentPartsResult,
} from "../types";
import { buildPartsFromDocument } from "../utils/build-parts-from-document";
import { toDocumentPartRow } from "../utils/to-document-part-row";

/**
 * Replaces a document's parts from its current body and media metadata.
 *
 * Delete-then-insert keeps this idempotent. Archived media belonging to the
 * old parts is removed from R2 so a re-fetched post with different attachments
 * does not leave orphan objects behind; the new parts start unscored.
 */
export async function rebuildDocumentParts(
  params: RebuildDocumentPartsParams,
): Promise<RebuildDocumentPartsResult> {
  const { documentId } = params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) throw new NotFoundError("document", documentId);

  const previous = await db
    .select({ storageKey: documentParts.storageKey })
    .from(documentParts)
    .where(eq(documentParts.documentId, documentId));

  const staleKeys = previous
    .map((row) => row.storageKey)
    .filter((key): key is string => Boolean(key));

  await db.delete(documentParts).where(eq(documentParts.documentId, documentId));

  const values = buildPartsFromDocument(doc);
  const inserted =
    values.length > 0
      ? await db.insert(documentParts).values(values).returning()
      : [];

  if (staleKeys.length > 0) {
    try {
      await deleteObjectsFromR2({ keys: staleKeys });
    } catch (error) {
      console.warn(
        `[rebuild-document-parts] Could not delete ${staleKeys.length} stale R2 object(s) for document ${documentId}: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    documentId,
    parts: inserted.map(toDocumentPartRow),
  };
}
