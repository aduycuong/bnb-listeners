import { and, desc, eq, inArray } from "drizzle-orm";

import {
  itemLabels,
  labelSampleItems,
  labelSamples,
  mentionAspects,
  mentions,
  projectAspects,
} from "@/db/schema";
import { db } from "@/lib/db";
import { SENTIMENTS } from "@/lib/enrichment/config";

import type { EnrichEvaluation } from "../types";
import { getLabelSampleSummary } from "./get-label-sample-summary";

function ratio(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : null;
}

function f1(precision: number | null, recall: number | null) {
  if (precision === null || recall === null || precision + recall === 0) return null;
  return (2 * precision * recall) / (precision + recall);
}

/**
 * Enrich against the labels of one `enrich` sample (D13/D14): sentiment
 * accuracy with a confusion matrix, and aspect precision/recall/F1 (micro and
 * per aspect). Only items labeled relevant and enriched count.
 * Returns null when no sample id is given and the project has no enrich sample.
 */
export async function evaluateEnrich(params: {
  projectId: string;
  sampleId?: string;
}): Promise<EnrichEvaluation | null> {
  let sampleId = params.sampleId;
  if (!sampleId) {
    const [latest] = await db
      .select({ id: labelSamples.id })
      .from(labelSamples)
      .where(and(eq(labelSamples.projectId, params.projectId), eq(labelSamples.kind, "enrich")))
      .orderBy(desc(labelSamples.createdAt))
      .limit(1);
    if (!latest) return null;
    sampleId = latest.id;
  }
  const sample = await getLabelSampleSummary({ projectId: params.projectId, sampleId });

  const rows = await db
    .select({
      mentionId: mentions.id,
      labelSentiment: itemLabels.sentiment,
      labelAspectKeys: itemLabels.aspectKeys,
      autoSentiment: mentions.autoSentiment,
    })
    .from(labelSampleItems)
    .innerJoin(
      itemLabels,
      and(
        eq(itemLabels.contentItemId, labelSampleItems.contentItemId),
        eq(itemLabels.projectId, params.projectId),
      ),
    )
    .innerJoin(
      mentions,
      and(
        eq(mentions.contentItemId, labelSampleItems.contentItemId),
        eq(mentions.projectId, params.projectId),
      ),
    )
    .where(
      and(
        eq(labelSampleItems.sampleId, sampleId),
        eq(itemLabels.isRelevant, true),
        eq(mentions.enrichStatus, "done"),
      ),
    );

  const aspects = await db
    .select({ id: projectAspects.id, key: projectAspects.key, name: projectAspects.name })
    .from(projectAspects)
    .where(eq(projectAspects.projectId, params.projectId));
  const keyOf = new Map(aspects.map((aspect) => [aspect.id, aspect.key]));
  const autoRows = rows.length
    ? await db
        .select({ mentionId: mentionAspects.mentionId, aspectId: mentionAspects.aspectId })
        .from(mentionAspects)
        .where(
          and(
            inArray(mentionAspects.mentionId, rows.map((row) => row.mentionId)),
            eq(mentionAspects.source, "auto"),
          ),
        )
    : [];

  const confusion: Record<string, Record<string, number>> = Object.fromEntries(
    SENTIMENTS.map((label) => [label, Object.fromEntries(SENTIMENTS.map((auto) => [auto, 0]))]),
  );
  const sentimentRows = rows.filter((row) => row.labelSentiment && row.autoSentiment);
  for (const row of sentimentRows) {
    const byLabel = confusion[row.labelSentiment!];
    if (byLabel && row.autoSentiment! in byLabel) byLabel[row.autoSentiment!] += 1;
  }
  const correct = sentimentRows.filter((row) => row.labelSentiment === row.autoSentiment).length;

  const aspectRows = rows.filter((row) => row.labelAspectKeys !== null);
  const counts = new Map(aspects.map((aspect) => [aspect.key, { tp: 0, fp: 0, fn: 0 }]));
  for (const row of aspectRows) {
    const truth = new Set(row.labelAspectKeys ?? []);
    const predicted = new Set(
      autoRows
        .filter((auto) => auto.mentionId === row.mentionId)
        .map((auto) => keyOf.get(auto.aspectId))
        .filter((key): key is string => Boolean(key)),
    );
    for (const key of new Set([...truth, ...predicted])) {
      const count = counts.get(key);
      if (!count) continue;
      if (truth.has(key) && predicted.has(key)) count.tp += 1;
      else if (predicted.has(key)) count.fp += 1;
      else count.fn += 1;
    }
  }
  const total = [...counts.values()].reduce(
    (sum, count) => ({ tp: sum.tp + count.tp, fp: sum.fp + count.fp, fn: sum.fn + count.fn }),
    { tp: 0, fp: 0, fn: 0 },
  );
  const microPrecision = ratio(total.tp, total.tp + total.fp);
  const microRecall = ratio(total.tp, total.tp + total.fn);

  return {
    sampleId,
    sampleName: sample.name,
    labeled: rows.length,
    sentimentAccuracy: ratio(correct, sentimentRows.length),
    confusion,
    aspect: { precision: microPrecision, recall: microRecall, f1: f1(microPrecision, microRecall) },
    byAspect: aspects.map((aspect) => {
      const count = counts.get(aspect.key)!;
      const precision = ratio(count.tp, count.tp + count.fp);
      const recall = ratio(count.tp, count.tp + count.fn);
      return {
        key: aspect.key,
        name: aspect.name,
        support: count.tp + count.fn,
        precision,
        recall,
        f1: f1(precision, recall),
      };
    }),
  };
}
