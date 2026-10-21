import { ENRICHER_REGISTRY, type EnricherKey, type EnricherSpec } from "../registry";
import type { LlmEnricher } from "../types";
import { aspectsEnricher } from "./aspects-enricher";
import { createExtractionEnricher } from "./create-extraction-enricher";
import { entitiesEnricher } from "./entities-enricher";
import { sentimentEnricher } from "./sentiment-enricher";
import { termsEnricher } from "./terms-enricher";
import { topicHintEnricher } from "./topic-hint-enricher";

const BUILT_IN: LlmEnricher[] = [
  sentimentEnricher,
  aspectsEnricher,
  entitiesEnricher,
  topicHintEnricher,
  termsEnricher,
];

/** Server-side implementation of every ready LLM enricher, by key. */
export const LLM_ENRICHERS: Partial<Record<EnricherKey, LlmEnricher>> = Object.fromEntries([
  ...BUILT_IN.map((enricher) => [enricher.key, enricher]),
  ...(Object.keys(ENRICHER_REGISTRY) as EnricherKey[]).flatMap((key) => {
    const spec: EnricherSpec = ENRICHER_REGISTRY[key];
    return spec.kind === "llm" && spec.status === "ready" && spec.extraction
      ? [[key, createExtractionEnricher(key, spec.extraction)]]
      : [];
  }),
]);

export function getLlmEnricher(key: EnricherKey): LlmEnricher {
  const enricher = LLM_ENRICHERS[key];
  if (!enricher) throw new Error(`No LLM enricher for "${key}"`);
  return enricher;
}
