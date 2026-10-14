import type { Persona } from "@/db/schema";

import type { PersonaRow } from "../types";

/** Maps a `personas` row plus its counts to the admin shape. */
export function toPersonaRow(
  persona: Persona,
  counts: { panelCount: number; authorCount: number },
): PersonaRow {
  return {
    id: persona.id,
    templateKey: persona.templateKey,
    name: persona.name,
    kind: persona.kind === "organization" ? "organization" : "individual",
    description: persona.description,
    tone: persona.tone,
    concerns: persona.concerns,
    version: persona.version,
    source: persona.source,
    reviewStatus: persona.reviewStatus,
    panelCount: counts.panelCount,
    authorCount: counts.authorCount,
    updatedAt: persona.updatedAt.toISOString(),
  };
}
