import { and, asc, eq, gte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { authors, contentItems, itemLabels, labelSampleItems, sources } from "@/db/schema";
import { db } from "@/lib/db";

import type { LabelSampleTask } from "../types";
import { getLabelSampleSummary } from "./get-label-sample-summary";

/**
 * The item at `position`, or the first unlabeled one from `position` on.
 * Match's decision is left out so the labeler is not led (D13).
 */
export async function getLabelSampleTask(params: {
  projectId: string;
  sampleId: string;
  position?: number;
  /** True: go to the next unlabeled item at or after `position`. */
  nextUnlabeled?: boolean;
}): Promise<LabelSampleTask> {
  const sample = await getLabelSampleSummary(params);
  const root = alias(contentItems, "root_item");
  const parent = alias(contentItems, "parent_item");
  const start = params.position ?? 0;

  const [row] = await db
    .select({
      position: labelSampleItems.position,
      contentItemId: contentItems.id,
      kind: contentItems.kind,
      text: contentItems.text,
      url: contentItems.url,
      publishedAt: contentItems.publishedAt,
      authorName: authors.name,
      sourceName: sources.name,
      rootId: root.id,
      rootText: root.text,
      rootUrl: root.url,
      parentText: parent.text,
      parentIsRoot: sql<boolean>`${parent.id} = ${root.id}`,
      label: itemLabels.isRelevant,
    })
    .from(labelSampleItems)
    .innerJoin(contentItems, eq(contentItems.id, labelSampleItems.contentItemId))
    .leftJoin(authors, eq(authors.id, contentItems.authorId))
    .leftJoin(sources, eq(sources.id, contentItems.sourceId))
    .leftJoin(root, eq(root.id, contentItems.rootId))
    .leftJoin(parent, eq(parent.id, contentItems.parentId))
    .leftJoin(
      itemLabels,
      and(
        eq(itemLabels.contentItemId, contentItems.id),
        eq(itemLabels.projectId, params.projectId),
      ),
    )
    .where(
      and(
        eq(labelSampleItems.sampleId, params.sampleId),
        params.nextUnlabeled
          ? and(gte(labelSampleItems.position, start), sql`${itemLabels.id} is null`)
          : eq(labelSampleItems.position, start),
      ),
    )
    .orderBy(asc(labelSampleItems.position))
    .limit(1);

  if (!row) {
    return { sample, position: start, item: null, root: null, parent: null, label: null };
  }

  return {
    sample,
    position: row.position,
    item: {
      contentItemId: row.contentItemId,
      kind: row.kind,
      text: row.text,
      url: row.url,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      authorName: row.authorName,
      sourceName: row.sourceName,
    },
    root: row.rootId ? { text: row.rootText ?? "", url: row.rootUrl } : null,
    parent: row.parentText && !row.parentIsRoot ? { text: row.parentText } : null,
    label: row.label ?? null,
  };
}
