import { createHash } from "node:crypto";

import { TRANSCRIPT_CORRECTION_CONFIG } from "../config";
import type { TranscriptGlossaryTerm } from "../types";

/** Same prompt, model, threshold and names give the same correction. */
export function computeCorrectionSignature(glossary: TranscriptGlossaryTerm[]): string {
  const names = glossary
    .map((term) => [term.name, ...[...term.aliases].sort()].join("|"))
    .sort();
  return createHash("sha256")
    .update(
      JSON.stringify([
        TRANSCRIPT_CORRECTION_CONFIG.promptVersion,
        TRANSCRIPT_CORRECTION_CONFIG.model,
        TRANSCRIPT_CORRECTION_CONFIG.minNameSimilarity,
        names,
      ]),
    )
    .digest("hex");
}
