import { and, eq, inArray, sql } from "drizzle-orm";

import {
  contentItems,
  itemLabels,
  mentions,
  projects,
  projectSources,
} from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { SetItemLabelParams, SetItemLabelResult } from "../types";

/**
 * Stores a labeler's answer apart from Match's output (D13) and applies it:
 * the mention's `is_relevant` follows the label; a missed item labeled
 * relevant becomes a `manual` mention. A null answer removes the label.
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

  await db
    .insert(itemLabels)
    .values({
      projectId: params.projectId,
      contentItemId: item.id,
      isRelevant: params.isRelevant,
      sampleId: params.sampleId ?? null,
      labeledBy: params.userId,
    })
    .onConflictDoUpdate({
      target: [itemLabels.projectId, itemLabels.contentItemId],
      set: {
        isRelevant: params.isRelevant,
        labeledBy: params.userId,
        labeledAt: new Date(),
        // A label given in a sample stays a sample label when corrected later.
        sampleId: sql`coalesce(excluded.sample_id, ${itemLabels.sampleId})`,
      },
    });

  if (mention) {
    await db
      .update(mentions)
      .set({ isRelevant: params.isRelevant, userCorrected: true, updatedAt: new Date() })
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
