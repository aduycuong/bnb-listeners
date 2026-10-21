import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { mentionEnrichments, mentionTerms, termDictionary } from "@/db/schema";
import { db } from "@/lib/db";

import { ENRICH_CONFIG } from "../config";
import { TERM_KINDS, type TermKind } from "../registry";
import type { IndexTermsResult, ProjectEnrichContext } from "../types";
import { normalizeKeyword } from "../utils/normalize-keyword";
import { loadEnrichContext } from "./load-enrich-context";

type RawTerm = { kind: TermKind; text: string };

type Dictionary = {
  /** `${kind}|${alias}` → canonical. */
  canonical: Map<string, string>;
  hidden: Set<string>;
};

async function loadDictionary(ctx: ProjectEnrichContext): Promise<Dictionary> {
  const rows = await db
    .select()
    .from(termDictionary)
    .where(
      or(
        and(eq(termDictionary.scopeType, "workspace"), eq(termDictionary.scopeId, ctx.workspaceId)),
        and(eq(termDictionary.scopeType, "project"), eq(termDictionary.scopeId, ctx.projectId)),
      ),
    );
  const dictionary: Dictionary = { canonical: new Map(), hidden: new Set() };
  // Workspace rows first so project rows win.
  for (const row of [...rows].sort((a, b) => Number(a.scopeType === "project") - Number(b.scopeType === "project"))) {
    const canonical = normalizeKeyword(row.canonical);
    if (row.hidden) dictionary.hidden.add(`${row.kind}|${canonical}`);
    for (const alias of [canonical, ...row.aliases.map(normalizeKeyword)]) {
      dictionary.canonical.set(`${row.kind}|${alias}`, canonical);
    }
  }
  return dictionary;
}

/**
 * Keywords naming a tracked entity are dropped: the cloud is about what people
 * discuss, not who (they still count as `brand` terms). Generic words and aspect
 * names ("Giá & thanh toán" → "giá", "thanh toán") are dropped, and so are
 * amounts and sizes, which start with a digit (D16).
 */
function keywordFilters(ctx: ProjectEnrichContext) {
  const entityNames = ctx.entities
    .flatMap((entity) => [entity.name, ...entity.aliases])
    .map((name) => ` ${normalizeKeyword(name)} `)
    .filter((name) => name.trim());
  const generic = new Set<string>([
    ...ENRICH_CONFIG.genericKeywords,
    ...ctx.aspects.flatMap((aspect) => [aspect.name, ...aspect.name.split(/[&,/]| và /)].map(normalizeKeyword)),
  ]);
  return (term: string) => {
    if (generic.has(term) || /^\d/.test(term)) return false;
    const padded = ` ${term} `;
    return !entityNames.some((name) => padded.includes(name) || name.includes(padded));
  };
}

function indexMention(dictionary: Dictionary, keepKeyword: (term: string) => boolean, raw: RawTerm[]) {
  const rows: { kind: TermKind; term: string; text: string }[] = [];
  const seen = new Set<string>();
  let keywords = 0;
  for (const entry of raw) {
    if (!TERM_KINDS.includes(entry.kind) || typeof entry.text !== "string") continue;
    const text = entry.text.replace(/\s+/g, " ").trim();
    let term = normalizeKeyword(text);
    if (!term || term.length > ENRICH_CONFIG.maxKeywordChars) continue;
    term = dictionary.canonical.get(`${entry.kind}|${term}`) ?? term;
    const id = `${entry.kind}|${term}`;
    if (seen.has(id) || dictionary.hidden.has(id)) continue;
    if (entry.kind === "keyword") {
      if (!keepKeyword(term) || keywords >= ENRICH_CONFIG.maxKeywords) continue;
      keywords += 1;
    }
    seen.add(id);
    rows.push({ kind: entry.kind, term, text });
  }
  return rows;
}

/**
 * `terms_index` stage (D16/D18): turns the raw `terms` extraction of up to
 * `termsPerStep` pending mentions into `mention_terms`, after normalization,
 * the dictionary and the keyword filters. Code only, so filters can change
 * and the index be rebuilt with `force` without another model call.
 */
export async function indexTerms(params: { projectId: string }): Promise<IndexTermsResult> {
  const ctx = await loadEnrichContext({ projectId: params.projectId });
  const stage = ctx.enrichers.find((enricher) => enricher.key === "terms_index");
  if (!stage) return { indexed: 0, more: false };

  const { rows } = await db.execute<{ mention_id: string; items: RawTerm[] | null }>(sql`
    select me.mention_id, x.data->'items' as items
    from mention_enrichments me
    join mentions m on m.id = me.mention_id
    left join mention_extractions x on x.mention_id = me.mention_id and x.schema_key = 'terms'
    where m.project_id = ${params.projectId}
      and m.is_relevant = true
      and me.enricher_key = 'terms_index'
      and (me.status = 'pending' or me.signature is distinct from ${stage.signature})
    order by m.published_at desc nulls last, m.id
    limit ${ENRICH_CONFIG.termsPerStep + 1}
  `);
  const batch = rows.slice(0, ENRICH_CONFIG.termsPerStep);
  if (batch.length === 0) return { indexed: 0, more: false };

  const dictionary = await loadDictionary(ctx);
  const keepKeyword = keywordFilters(ctx);
  const ids = batch.map((row) => row.mention_id);
  const values = batch.flatMap((row) =>
    indexMention(dictionary, keepKeyword, Array.isArray(row.items) ? row.items : []).map((term) => ({
      mentionId: row.mention_id,
      ...term,
    })),
  );

  const writes: BatchItem<"pg">[] = [db.delete(mentionTerms).where(inArray(mentionTerms.mentionId, ids))];
  if (values.length > 0) writes.push(db.insert(mentionTerms).values(values));
  writes.push(
    db
      .update(mentionEnrichments)
      .set({ status: "done", signature: stage.signature, model: null, error: null, enrichedAt: new Date() })
      .where(and(inArray(mentionEnrichments.mentionId, ids), eq(mentionEnrichments.enricherKey, "terms_index"))),
  );
  await db.batch(writes as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return { indexed: batch.length, more: rows.length > batch.length };
}
