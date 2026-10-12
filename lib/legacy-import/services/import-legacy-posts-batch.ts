import { and, asc, eq, gt, ilike } from "drizzle-orm";

import { type Document, documents } from "@/db/schema";
import { parseFacebookReactions } from "@/lib/connectors/facebook/utils/parse-facebook-reactions";
import { registerFacebookSource } from "@/lib/connectors/services/register-facebook-source";
import { db } from "@/lib/db";
import { updateSourceDetails } from "@/lib/raw-store/services/update-source-details";
import { writeContentItems } from "@/lib/raw-store/services/write-content-items";
import type { NormalizedContentItem } from "@/lib/raw-store/types";

import type {
  ImportLegacyBatchResult,
  ImportLegacyPostsBatchParams,
} from "../types";
import { filterConnectorCollected } from "../utils/filter-connector-collected";
import { readMetadata } from "../utils/read-metadata";

function toContentItem(doc: Document): NormalizedContentItem {
  const meta = doc.metadata;
  const authorExternalId =
    readMetadata.string(meta, "authorId") ?? readMetadata.string(meta, "authorUrl");

  return {
    kind: "post",
    externalId: doc.sourceItemId,
    url: readMetadata.string(meta, "postUrl"),
    text: doc.rawContent.trim(),
    media: [
      ...readMetadata.stringArray(meta, "imageUrls").map((url) => ({
        type: "image" as const,
        url,
      })),
      ...readMetadata.stringArray(meta, "videoUrls").map((url) => ({
        type: "video" as const,
        url,
      })),
    ],
    publishedAt: doc.publishedAt,
    likeCount: doc.likeCount,
    commentCount: doc.commentCount,
    shareCount: doc.shareCount,
    viewCount: doc.viewCount,
    reactions: Array.isArray(meta.reactions)
      ? parseFacebookReactions(meta.reactions)
      : null,
    author: authorExternalId
      ? {
          externalId: authorExternalId,
          name: doc.authorName ?? readMetadata.string(meta, "authorName"),
          url: readMetadata.string(meta, "authorUrl"),
          metadata: { isPage: meta.isPage === true },
        }
      : null,
    parentExternalId: null,
    rootExternalId: null,
    metadata: {
      legacyDocumentId: doc.id,
      isSponsored: meta.isSponsored === true,
      hashtags: readMetadata.stringArray(meta, "hashtags"),
    },
    collectedAt: doc.updatedAt,
  };
}

/** Imports one page of Facebook `documents` (doc_type = post) as `content_items`. */
export async function importLegacyPostsBatch(
  params: ImportLegacyPostsBatchParams,
): Promise<ImportLegacyBatchResult> {
  const docs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.docType, "post"),
        ilike(documents.sourceOriginKey, "%facebook.com%"),
        params.afterId ? gt(documents.id, params.afterId) : undefined,
      ),
    )
    .orderBy(asc(documents.id))
    .limit(params.limit);

  const result: ImportLegacyBatchResult = {
    nextAfterId: docs.length === params.limit ? docs[docs.length - 1].id : null,
    read: docs.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
  };

  const bySource = new Map<string, Document[]>();
  for (const doc of docs) {
    const group = bySource.get(doc.sourceOriginKey) ?? [];
    group.push(doc);
    bySource.set(doc.sourceOriginKey, group);
  }

  for (const [sourceUrl, group] of bySource) {
    const first = group[0];
    let sourceId: string;

    try {
      ({ sourceId } = await registerFacebookSource({
        url: sourceUrl,
        name: first.sourceOriginName,
      }));
    } catch {
      result.skipped += group.length;
      continue;
    }

    await updateSourceDetails({
      sourceId,
      name: first.sourceOriginName,
      memberCount: readMetadata.number(first.metadata, "groupMembers"),
      metadata: {
        ...(readMetadata.string(first.metadata, "groupId") && {
          groupId: readMetadata.string(first.metadata, "groupId"),
        }),
      },
    });

    const items = await filterConnectorCollected(group.map(toContentItem));
    result.skipped += group.length - items.length;

    const written = await writeContentItems({
      platform: "facebook",
      origin: "legacy_import",
      items,
      sourceId,
      collectRunId: params.collectRunId,
    });

    result.inserted += written.inserted;
    result.updated += written.updated;
  }

  return result;
}
