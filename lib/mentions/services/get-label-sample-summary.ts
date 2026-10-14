import { and, count, desc, eq, sql } from "drizzle-orm";

import { itemLabels, labelSampleItems, labelSamples, projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { LabelSampleSummary } from "../types";

/** Samples of a project with progress; one sample when `sampleId` is given. */
export async function listLabelSampleSummaries(params: {
  projectId: string;
  sampleId?: string;
}): Promise<LabelSampleSummary[]> {
  const labeled = db
    .select({ sampleId: labelSampleItems.sampleId, n: count().as("labeled") })
    .from(labelSampleItems)
    .innerJoin(
      itemLabels,
      and(
        eq(itemLabels.contentItemId, labelSampleItems.contentItemId),
        eq(itemLabels.projectId, params.projectId),
      ),
    )
    .groupBy(labelSampleItems.sampleId)
    .as("labeled_counts");
  const sizes = db
    .select({ sampleId: labelSampleItems.sampleId, n: count().as("size") })
    .from(labelSampleItems)
    .groupBy(labelSampleItems.sampleId)
    .as("sample_sizes");

  const rows = await db
    .select({
      id: labelSamples.id,
      name: labelSamples.name,
      createdAt: labelSamples.createdAt,
      strata: labelSamples.strata,
      matchSignature: labelSamples.matchSignature,
      projectSignature: projects.matchSignature,
      size: sql<number>`coalesce(${sizes.n}, 0)`.mapWith(Number),
      labeled: sql<number>`coalesce(${labeled.n}, 0)`.mapWith(Number),
    })
    .from(labelSamples)
    .innerJoin(projects, eq(projects.id, labelSamples.projectId))
    .leftJoin(sizes, eq(sizes.sampleId, labelSamples.id))
    .leftJoin(labeled, eq(labeled.sampleId, labelSamples.id))
    .where(
      and(
        eq(labelSamples.projectId, params.projectId),
        params.sampleId ? eq(labelSamples.id, params.sampleId) : undefined,
      ),
    )
    .orderBy(desc(labelSamples.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    size: row.size,
    labeled: row.labeled,
    strata: row.strata,
    current: row.matchSignature === row.projectSignature,
  }));
}

export async function getLabelSampleSummary(params: {
  projectId: string;
  sampleId: string;
}): Promise<LabelSampleSummary> {
  const [summary] = await listLabelSampleSummaries(params);
  if (!summary) throw new NotFoundError("label sample", params.sampleId);
  return summary;
}
