import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { isChatModelConfigured } from "@/lib/langchain";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  TOP_TERMS_DEFAULT_LIMIT,
  TOP_TERMS_LLM_BATCH_SIZE,
  TOP_TERMS_MAX_SCANNED,
  TOP_TERMS_RELEVANCE_CONFIDENCE_MIN,
  TOP_TERMS_RELEVANCE_MODEL,
} from "../top-terms-config";
import type {
  FindRelevantTopTermsItem,
  FindRelevantTopTermsParams,
  FindRelevantTopTermsResult,
} from "../types";
import { evaluateTermsRelevanceWithLlm } from "../utils/evaluate-terms-relevance-with-llm";

type ActiveTermRow = {
  id: string;
  name: string;
  description: string | null;
  doc_count: number;
  trend_score: number | null;
};

/**
 * Terms with at least one matched document in the period, ranked by summed
 * trend score. Deterministic ordering so offset pagination is stable within
 * one run.
 */
async function listActiveTermsByTrendScore(params: {
  workspaceId: string;
  startDate: string;
  endDate: string;
  offset: number;
  limit: number;
}): Promise<ActiveTermRow[]> {
  const result = await db.execute<ActiveTermRow>(sql`
    SELECT
      t.id,
      t.name,
      t.description,
      SUM(tdd.doc_count)::int AS doc_count,
      SUM(tdd.trend_score) AS trend_score
    FROM terms t
    INNER JOIN term_digest_daily tdd
      ON tdd.term_id = t.id
      AND tdd.date_key >= ${params.startDate}::date
      AND tdd.date_key <= ${params.endDate}::date
    WHERE t.workspace_id = ${params.workspaceId}::uuid
    GROUP BY t.id, t.name, t.description
    HAVING SUM(tdd.doc_count) > 0
    ORDER BY trend_score DESC NULLS LAST, t.name ASC, t.id ASC
    OFFSET ${params.offset}
    LIMIT ${params.limit}
  `);

  return result.rows;
}

function toItem(
  row: ActiveTermRow,
  confidence: number | null,
): FindRelevantTopTermsItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    docCount: row.doc_count,
    trendScore: row.trend_score,
    confidence,
  };
}

/**
 * Finds the top terms in a period that relate to `query`. Scans active terms
 * in trend-score order, batch by batch, asking an LLM agent (with optional
 * Exa web lookup) which ones are relevant, and stops once `limit` relevant
 * terms are collected, every active term has been evaluated, or the
 * `TOP_TERMS_MAX_SCANNED` cost guard is reached.
 *
 * An empty query skips the LLM and returns the top `limit` terms by trend.
 */
export async function findRelevantTopTerms(
  params: FindRelevantTopTermsParams,
  ctx: WorkspaceContext,
): Promise<FindRelevantTopTermsResult> {
  const query = params.query.trim();
  const limit = Math.max(1, params.limit ?? TOP_TERMS_DEFAULT_LIMIT);
  const period = params.period;
  const pageParams = {
    workspaceId: ctx.workspaceId,
    startDate: period.startDate,
    endDate: period.endDate,
  };

  if (query.length === 0) {
    const rows = await listActiveTermsByTrendScore({
      ...pageParams,
      offset: 0,
      limit,
    });

    return {
      query,
      period,
      items: rows.map((row) => toItem(row, null)),
      termsScanned: rows.length,
      exhausted: rows.length < limit,
      webQueries: 0,
    };
  }

  if (!isChatModelConfigured(TOP_TERMS_RELEVANCE_MODEL)) {
    throw new Error(
      "Chat model is not configured; cannot evaluate term relevance.",
    );
  }

  const items: FindRelevantTopTermsItem[] = [];
  let offset = 0;
  let termsScanned = 0;
  let webQueries = 0;
  let exhausted = false;

  while (items.length < limit && termsScanned < TOP_TERMS_MAX_SCANNED) {
    const batchLimit = Math.min(
      TOP_TERMS_LLM_BATCH_SIZE,
      TOP_TERMS_MAX_SCANNED - termsScanned,
    );
    const rows = await listActiveTermsByTrendScore({
      ...pageParams,
      offset,
      limit: batchLimit,
    });

    if (rows.length === 0) {
      exhausted = true;
      break;
    }

    const evaluation = await evaluateTermsRelevanceWithLlm({
      query,
      selectionCriteria: params.selectionCriteria,
      terms: rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
      })),
      enableWebResearch: params.enableWebResearch,
    });

    const verdictByTermId = new Map(
      evaluation.results.map((item) => [item.termId, item]),
    );

    // Keep DB (trend) order so the result stays ranked by trend score.
    for (const row of rows) {
      if (items.length >= limit) break;

      const verdict = verdictByTermId.get(row.id);
      if (
        verdict?.relevant &&
        verdict.confidence >= TOP_TERMS_RELEVANCE_CONFIDENCE_MIN
      ) {
        items.push(toItem(row, verdict.confidence));
      }
    }

    termsScanned += rows.length;
    offset += rows.length;
    webQueries += evaluation.webQueries;

    if (rows.length < batchLimit) {
      exhausted = true;
      break;
    }
  }

  if (termsScanned >= TOP_TERMS_MAX_SCANNED) {
    exhausted = true;
  }

  return { query, period, items, termsScanned, exhausted, webQueries };
}
