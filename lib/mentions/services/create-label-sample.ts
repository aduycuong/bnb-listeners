import { and, count, eq, inArray, ne, sql } from "drizzle-orm";

import {
  contentItems,
  labelSampleItems,
  labelSamples,
  mentions,
  projects,
  projectSources,
} from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { CreateLabelSampleParams, LabelSampleStratum, LabelSampleSummary } from "../types";
import { getLabelSampleSummary } from "./get-label-sample-summary";

/** Rejected candidates get at least this many of the mention slots, when there are that many. */
const MIN_REJECTED = 10;

function shuffle<T>(values: T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

/**
 * Draws a stratified random sample of a project's items (D13):
 * `relevant` (Match said yes), `rejected` (tier 2 said no) and `unmatched`
 * (not a candidate). Stratum sizes are stored for weighted recall.
 */
export async function createLabelSample(
  params: CreateLabelSampleParams,
): Promise<LabelSampleSummary> {
  const [project] = await db
    .select({ matchSignature: projects.matchSignature })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);
  if (!project) throw new NotFoundError("project", params.projectId);
  if (!project.matchSignature) {
    throw new InvalidInputError("Project chưa chạy Match xong, chưa lấy mẫu được.");
  }

  const followed = db
    .select({ sourceId: projectSources.sourceId })
    .from(projectSources)
    .where(eq(projectSources.projectId, params.projectId));
  const candidates = db
    .select({ id: mentions.contentItemId })
    .from(mentions)
    .where(and(eq(mentions.projectId, params.projectId), sql`${mentions.autoIsRelevant} is not null`));

  const mentionStratum = (relevant: boolean) =>
    and(eq(mentions.projectId, params.projectId), eq(mentions.autoIsRelevant, relevant));
  const unmatchedWhere = and(
    inArray(contentItems.sourceId, followed),
    sql`${contentItems.id} not in (${candidates})`,
    ne(contentItems.text, ""),
  );

  const [[relevantCount], [rejectedCount], [unmatchedCount]] = await Promise.all([
    db.select({ n: count() }).from(mentions).where(mentionStratum(true)),
    db.select({ n: count() }).from(mentions).where(mentionStratum(false)),
    db.select({ n: count() }).from(contentItems).where(unmatchedWhere),
  ]);
  const population: Record<LabelSampleStratum, number> = {
    relevant: relevantCount?.n ?? 0,
    rejected: rejectedCount?.n ?? 0,
    unmatched: unmatchedCount?.n ?? 0,
  };

  const mentionTotal = population.relevant + population.rejected;
  const mentionSlots = Math.min(params.mentions, mentionTotal);
  let rejectedSlots = mentionTotal
    ? Math.round((mentionSlots * population.rejected) / mentionTotal)
    : 0;
  rejectedSlots = Math.min(
    population.rejected,
    Math.max(rejectedSlots, Math.min(MIN_REJECTED, population.rejected, mentionSlots)),
  );
  const relevantSlots = Math.min(population.relevant, mentionSlots - rejectedSlots);
  const unmatchedSlots = Math.min(params.unmatched, population.unmatched);

  const pick = async (relevant: boolean, limit: number) =>
    limit === 0
      ? []
      : db
          .select({ id: mentions.contentItemId })
          .from(mentions)
          .where(mentionStratum(relevant))
          .orderBy(sql`random()`)
          .limit(limit);

  const [relevantRows, rejectedRows, unmatchedRows] = await Promise.all([
    pick(true, relevantSlots),
    pick(false, rejectedSlots),
    unmatchedSlots === 0
      ? []
      : db
          .select({ id: contentItems.id })
          .from(contentItems)
          .where(unmatchedWhere)
          .orderBy(sql`random()`)
          .limit(unmatchedSlots),
  ]);

  const picked = shuffle([
    ...relevantRows.map((row) => ({ id: row.id, stratum: "relevant" as const })),
    ...rejectedRows.map((row) => ({ id: row.id, stratum: "rejected" as const })),
    ...unmatchedRows.map((row) => ({ id: row.id, stratum: "unmatched" as const })),
  ]);
  if (picked.length === 0) throw new InvalidInputError("Không có nội dung nào để lấy mẫu.");

  const [{ n: existing } = { n: 0 }] = await db
    .select({ n: count() })
    .from(labelSamples)
    .where(eq(labelSamples.projectId, params.projectId));

  const sampleId = crypto.randomUUID();
  await db.batch([
    db.insert(labelSamples).values({
      id: sampleId,
      projectId: params.projectId,
      name: `Mẫu ${existing + 1}`,
      strata: {
        relevant: { population: population.relevant, sampled: relevantRows.length },
        rejected: { population: population.rejected, sampled: rejectedRows.length },
        unmatched: { population: population.unmatched, sampled: unmatchedRows.length },
      },
      matchSignature: project.matchSignature,
      createdBy: params.userId,
    }),
    db.insert(labelSampleItems).values(
      picked.map((row, position) => ({
        sampleId,
        contentItemId: row.id,
        stratum: row.stratum,
        position,
      })),
    ),
  ]);

  return getLabelSampleSummary({ projectId: params.projectId, sampleId });
}
