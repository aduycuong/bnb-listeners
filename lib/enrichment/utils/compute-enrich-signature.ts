import { createHash } from "node:crypto";

import { ENRICH_CONFIG } from "../config";
import type { EnrichAspect, EnrichEntity } from "../types";

/** Changes when anything the Enrich prompt depends on changes (D14). */
export function computeEnrichSignature(params: {
  caseLabel: string;
  caseVersion: number;
  aspects: EnrichAspect[];
  entities: EnrichEntity[];
  extractionKeys: string[];
}): string {
  const payload = {
    prompt: ENRICH_CONFIG.promptVersion,
    model: ENRICH_CONFIG.model,
    case: `${params.caseLabel}@${params.caseVersion}`,
    aspects: params.aspects
      .map((aspect) => `${aspect.id}|${aspect.key}|${aspect.name}|${aspect.description}`)
      .sort(),
    entities: params.entities
      .map((entity) => `${entity.id}|${entity.name}|${entity.role}|${[...entity.aliases].sort().join(",")}`)
      .sort(),
    extractions: [...params.extractionKeys].sort(),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}
