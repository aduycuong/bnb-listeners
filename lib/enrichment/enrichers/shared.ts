import { z } from "zod";

import { SENTIMENTS } from "../config";
import type { EnrichAspect, EnrichEntity } from "../types";

/**
 * A fresh enum per field: a shared schema becomes a JSON Schema $ref, which
 * OpenAI rejects when the field also has a description.
 */
export function sentimentEnum() {
  return z.enum(SENTIMENTS);
}

/** Aspect fields of the signature: id, key, name and description all shape the prompt. */
export function aspectSignature(aspects: EnrichAspect[]) {
  return aspects.map((aspect) => `${aspect.id}|${aspect.key}|${aspect.name}|${aspect.description}`).sort();
}

/** Entity fields of the signature. */
export function entitySignature(entities: EnrichEntity[]) {
  return entities
    .map((entity) => `${entity.id}|${entity.name}|${entity.role}|${[...entity.aliases].sort().join(",")}`)
    .sort();
}

export function isSentiment(value: unknown): value is (typeof SENTIMENTS)[number] {
  return typeof value === "string" && (SENTIMENTS as readonly string[]).includes(value);
}
