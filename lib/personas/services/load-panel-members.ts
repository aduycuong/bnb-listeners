import { eq } from "drizzle-orm";

import { personaPanelMembers, personas } from "@/db/schema";
import { db } from "@/lib/db";

import type { PanelMember } from "../types";

/** Members of a panel with their weights; empty when the panel does not exist or has none. */
export async function loadPanelMembers(panelId: string): Promise<PanelMember[]> {
  const rows = await db
    .select({
      id: personas.id,
      templateKey: personas.templateKey,
      name: personas.name,
      kind: personas.kind,
      description: personas.description,
      tone: personas.tone,
      concerns: personas.concerns,
      weight: personaPanelMembers.weight,
    })
    .from(personaPanelMembers)
    .innerJoin(personas, eq(personas.id, personaPanelMembers.personaId))
    .where(eq(personaPanelMembers.panelId, panelId));

  return rows
    .filter((row) => row.weight > 0)
    .map((row) => ({
      weight: row.weight,
      persona: {
        id: row.id,
        templateKey: row.templateKey,
        name: row.name,
        kind: row.kind === "organization" ? "organization" : "individual",
        description: row.description,
        tone: row.tone,
        concerns: row.concerns,
      },
    }));
}
