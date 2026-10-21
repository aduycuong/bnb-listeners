import { type SQL, sql } from "drizzle-orm";

import { ENRICHER_REGISTRY, type EnricherKey, type EnricherSpec } from "../registry";
import type { EnrichRunOptions, ProjectEnrichContext, ProjectEnricherState } from "../types";

/** Enabled LLM enrichers of the run: all of them, or those named by `only`. */
export function selectLlmEnrichers(ctx: ProjectEnrichContext, options: EnrichRunOptions = {}): ProjectEnricherState[] {
  return ctx.enrichers.filter((enricher) => {
    const spec: EnricherSpec = ENRICHER_REGISTRY[enricher.key];
    return spec.kind === "llm" && (!options.only || options.only.includes(enricher.key));
  });
}

/** Enabled stage enrichers of the run: those named by `only`, or whose inputs are part of it. */
export function selectStageEnrichers(ctx: ProjectEnrichContext, options: EnrichRunOptions = {}): EnricherKey[] {
  const llmKeys = new Set(selectLlmEnrichers(ctx, options).map((enricher) => enricher.key));
  return ctx.enrichers
    .filter((enricher) => {
      const spec: EnricherSpec = ENRICHER_REGISTRY[enricher.key];
      if (spec.kind !== "stage") return false;
      if (options.only) return options.only.includes(enricher.key) || spec.requires.some((key) => llmKeys.has(key as EnricherKey));
      return true;
    })
    .map((enricher) => enricher.key);
}

/**
 * `(mention, key)` pairs of relevant mentions that need an LLM enricher:
 * no row yet, failed, or run under another signature or text (D18). Aliases:
 * `m` mentions, `ci` content_items, `k(key, signature)`, `me` mention_enrichments.
 */
export function pendingPairsSql(params: {
  projectId: string;
  enrichers: ProjectEnricherState[];
  force?: boolean;
  select: SQL;
  extraWhere?: SQL;
}): SQL {
  const values = sql.join(
    params.enrichers.map((enricher) => sql`(${enricher.key}, ${enricher.signature})`),
    sql`, `,
  );
  const stale = params.force
    ? sql`true`
    : sql`(me.mention_id is null or me.status = 'failed' or me.signature is distinct from k.signature or me.content_hash is distinct from ci.content_hash)`;
  return sql`
    select ${params.select}
    from mentions m
    join content_items ci on ci.id = m.content_item_id
    cross join (values ${values}) as k(key, signature)
    left join mention_enrichments me on me.mention_id = m.id and me.enricher_key = k.key
    where m.project_id = ${params.projectId}
      and m.is_relevant = true
      and ${stale}
      ${params.extraWhere ? sql`and ${params.extraWhere}` : sql``}
  `;
}
