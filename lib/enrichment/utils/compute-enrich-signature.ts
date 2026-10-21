import { createHash } from "node:crypto";

/**
 * Signature of one enricher for one project (D18): its version, the model
 * and the project config it depends on. A mention whose stored signature
 * differs runs that enricher again, and only that one.
 */
export function computeEnricherSignature(params: {
  key: string;
  version: number;
  model: string | null;
  input: unknown;
}): string {
  return createHash("sha256")
    .update(JSON.stringify([params.key, params.version, params.model, params.input]))
    .digest("hex")
    .slice(0, 32);
}
