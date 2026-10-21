import { and, eq, inArray, sql } from "drizzle-orm";

import {
  contentItems,
  itemLabels,
  mentions,
  projectAspects,
  projects,
  projectSources,
} from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { SetItemLabelParams, SetItemLabelResult } from "../types";

/**
 * Stores a labeler's answer apart from Match's output (D13) and applies it:
 * the mention's `is_relevant` and `sentiment` follow the label; a missed item
 * labeled relevant becomes a `manual` mention. Sentiment and aspects are only
 * changed when given. A null answer removes the whole label.
 */
export async function setItemLabel(params: SetItemLabelParams): Promise<SetItemLabelResult> {
  const followed = db
    .select({ sourceId: projectSources.sourceId })
    .from(projectSources)
    .where(eq(projectSources.projectId, params.projectId));
  const [item] = await db
    .select({
      id: contentItems.id,
      kind: contentItems.kind,
      rootId: contentItems.rootId,
      platform: contentItems.platform,
      sourceId: contentItems.sourceId,
      authorId: contentItems.authorId,
      publishedAt: contentItems.publishedAt,
      origin: contentItems.origin,
    })
    .from(contentItems)
    .where(and(eq(contentItems.id, params.contentItemId), inArray(contentItems.sourceId, followed)))
    .limit(1);
  if (!item) throw new NotFoundError("content item in project sources", params.contentItemId);

  const [mention] = await db
    .select({ id: mentions.id, matchTier: mentions.matchTier })
    .from(mentions)
    .where(and(eq(mentions.projectId, params.projectId), eq(mentions.contentItemId, item.id)))
    .limit(1);

  if (params.isRelevant === null) {
    await db
      .delete(itemLabels)
      .where(and(eq(itemLabels.projectId, params.projectId), eq(itemLabels.contentItemId, item.id)));
    if (mention?.matchTier === "user") {
      await db.delete(mentions).where(eq(mentions.id, mention.id));
    } else if (mention) {
      await db
        .update(mentions)
        .set({
          isRelevant: sql`coalesce(${mentions.autoIsRelevant}, false)`,
          userCorrected: false,
          updatedAt: new Date(),
        })
        .where(eq(mentions.id, mention.id));
    }
    return {
      contentItemId: item.id,
      label: null,
      isRelevant: null,
      message: "Đã bỏ nhãn, trả về kết quả của hệ thống.",
    };
  }

  if (params.aspectKeys?.length) {
    const known = await db
      .select({ key: projectAspects.key })
      .from(projectAspects)
      .where(eq(projectAspects.projectId, params.projectId));
    const keys = new Set(known.map((row) => row.key));
    const unknown = params.aspectKeys.find((key) => !keys.has(key));
    if (unknown) throw new InvalidInputError(`Khía cạnh "${unknown}" không thuộc project.`);
  }

  await db
    .insert(itemLabels)
    .values({
      projectId: params.projectId,
      contentItemId: item.id,
      isRelevant: params.isRelevant,
      sentiment: params.sentiment ?? null,
      aspectKeys: params.aspectKeys ?? null,
      sampleId: params.sampleId ?? null,
      labeledBy: params.userId,
    })
    .onConflictDoUpdate({
      target: [itemLabels.projectId, itemLabels.contentItemId],
      set: {
        isRelevant: params.isRelevant,
        ...(params.sentiment !== undefined && { sentiment: params.sentiment }),
        ...(params.aspectKeys !== undefined && { aspectKeys: params.aspectKeys }),
        labeledBy: params.userId,
        labeledAt: new Date(),
        // A label given in a sample stays a sample label when corrected later.
        sampleId: sql`coalesce(excluded.sample_id, ${itemLabels.sampleId})`,
      },
    });

  if (mention) {
    await db
      .update(mentions)
      .set({
        isRelevant: params.isRelevant,
        userCorrected: true,
        updatedAt: new Date(),
      })
      .where(eq(mentions.id, mention.id));
  } else if (params.isRelevant) {
    const [project] = await db
      .select({ matchSignature: projects.matchSignature })
      .from(projects)
      .where(eq(projects.id, params.projectId))
      .limit(1);
    await db.insert(mentions).values({
      projectId: params.projectId,
      contentItemId: item.id,
      rootItemId: item.rootId ?? item.id,
      kind: item.kind,
      platform: item.platform,
      sourceId: item.sourceId,
      authorId: item.authorId,
      publishedAt: item.publishedAt,
      origin: item.origin,
      matchType: "manual",
      matchTier: "user",
      isRelevant: true,
      autoIsRelevant: null,
      matchSignature: project?.matchSignature ?? "",
      userCorrected: true,
    });
  }

  return {
    contentItemId: item.id,
    label: params.isRelevant,
    isRelevant: params.isRelevant,
    message: params.isRelevant ? "Đã gán: có liên quan." : "Đã gán: không liên quan.",
  };
}
