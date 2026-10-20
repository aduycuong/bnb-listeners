import { and, desc, eq } from "drizzle-orm";

import { itemLabels, labelSampleItems, labelSamples, mentions } from "@/db/schema";
import { db } from "@/lib/db";

import type { LabelSampleStratum, MatchEvaluation } from "../types";
import { getLabelSampleSummary } from "./get-label-sample-summary";

const STRATA: LabelSampleStratum[] = ["relevant", "rejected", "unmatched"];

/**
 * Precision and recall of Match on one random sample (D13). Only labels of
 * sampled items count. Recall weights each stratum's labeled share by its
 * population, since strata are sampled at different rates.
 * Returns null when no sample id is given and the project has no match sample.
 */
export async function evaluateMatch(params: {
  projectId: string;
  /** Latest sample when omitted. */
  sampleId?: string;
}): Promise<MatchEvaluation | null> {
  let sampleId = params.sampleId;
  if (!sampleId) {
    const [latest] = await db
      .select({ id: labelSamples.id })
      .from(labelSamples)
      .where(and(eq(labelSamples.projectId, params.projectId), eq(labelSamples.kind, "match")))
      .orderBy(desc(labelSamples.createdAt))
      .limit(1);
    if (!latest) return null;
    sampleId = latest.id;
  }

  const sample = await getLabelSampleSummary({ projectId: params.projectId, sampleId });
  const rows = await db
    .select({
      stratum: labelSampleItems.stratum,
      label: itemLabels.isRelevant,
      matchType: mentions.matchType,
    })
    .from(labelSampleItems)
    .innerJoin(
      itemLabels,
      and(
        eq(itemLabels.contentItemId, labelSampleItems.contentItemId),
        eq(itemLabels.projectId, params.projectId),
      ),
    )
    .leftJoin(
      mentions,
      and(
        eq(mentions.contentItemId, labelSampleItems.contentItemId),
        eq(mentions.projectId, params.projectId),
      ),
    )
    .where(eq(labelSampleItems.sampleId, sampleId));

  const strata = STRATA.map((stratum) => {
    const labeled = rows.filter((row) => row.stratum === stratum);
    return {
      stratum,
      population: sample.strata[stratum]?.population ?? 0,
      sampled: sample.strata[stratum]?.sampled ?? 0,
      labeled: labeled.length,
      labeledRelevant: labeled.filter((row) => row.label).length,
    };
  });

  const share = (stratum: (typeof strata)[number]) =>
    stratum.labeled ? stratum.labeledRelevant / stratum.labeled : null;
  const [relevant, rejected, unmatched] = strata;

  const precision = share(relevant);
  const missedShares = [rejected, unmatched].map((stratum) =>
    stratum.population === 0 ? 0 : share(stratum),
  );
  let recall: number | null = null;
  if (precision !== null && missedShares.every((value) => value !== null)) {
    const found = relevant.population * precision;
    const missed =
      rejected.population * (missedShares[0] ?? 0) + unmatched.population * (missedShares[1] ?? 0);
    recall = found + missed > 0 ? found / (found + missed) : null;
  }

  const relevantRows = rows.filter((row) => row.stratum === "relevant");
  const precisionByMatchType = ["direct", "context"].map((matchType) => {
    const group = relevantRows.filter((row) => row.matchType === matchType);
    return {
      matchType,
      labeled: group.length,
      precision: group.length ? group.filter((row) => row.label).length / group.length : null,
    };
  });

  return {
    sampleId,
    sampleName: sample.name,
    current: sample.current,
    labeled: rows.length,
    strata,
    precision,
    recall,
    precisionByMatchType,
  };
}
