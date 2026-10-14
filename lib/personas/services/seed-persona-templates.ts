import { inArray } from "drizzle-orm";

import {
  personaPanelMembers,
  personaPanels,
  personas,
} from "@/db/schema";
import { db } from "@/lib/db";
import {
  PERSONA_PANEL_TEMPLATES,
  PERSONA_TEMPLATES,
} from "@/lib/personas/persona-templates";

export type SeedPersonaTemplatesResult = {
  personasCreated: string[];
  personasSkipped: string[];
  panelsCreated: string[];
  panelsSkipped: string[];
};

/**
 * Insert the template personas and panels. Idempotent by `template_key`:
 * existing rows are left untouched, so hand edits survive a re-run.
 * A panel that already exists keeps its current members.
 */
export async function seedPersonaTemplates(): Promise<SeedPersonaTemplatesResult> {
  const insertedPersonas = await db
    .insert(personas)
    .values(
      PERSONA_TEMPLATES.map((template) => ({
        templateKey: template.templateKey,
        name: template.name,
        kind: template.kind,
        description: template.description,
        tone: template.tone,
        concerns: template.concerns,
        source: "template",
        reviewStatus: "approved",
      })),
    )
    .onConflictDoNothing({ target: personas.templateKey })
    .returning({ templateKey: personas.templateKey });
  const createdPersonaKeys = new Set(
    insertedPersonas.map((row) => row.templateKey),
  );

  const personaRows = await db
    .select({ id: personas.id, templateKey: personas.templateKey })
    .from(personas)
    .where(
      inArray(
        personas.templateKey,
        PERSONA_TEMPLATES.map((template) => template.templateKey),
      ),
    );
  const personaIdByKey = new Map(
    personaRows.map((row) => [row.templateKey, row.id]),
  );

  const insertedPanels = await db
    .insert(personaPanels)
    .values(
      PERSONA_PANEL_TEMPLATES.map((template) => ({
        templateKey: template.templateKey,
        name: template.name,
        description: template.description,
      })),
    )
    .onConflictDoNothing({ target: personaPanels.templateKey })
    .returning({ id: personaPanels.id, templateKey: personaPanels.templateKey });
  const newPanelIdByKey = new Map(
    insertedPanels.map((row) => [row.templateKey, row.id]),
  );

  const memberRows = PERSONA_PANEL_TEMPLATES.flatMap((template) => {
    const panelId = newPanelIdByKey.get(template.templateKey);
    if (!panelId) return [];
    return template.members.map((member) => {
      const personaId = personaIdByKey.get(member.personaKey);
      if (!personaId) {
        throw new Error(
          `Panel "${template.templateKey}" references unknown persona "${member.personaKey}".`,
        );
      }
      return { panelId, personaId, weight: member.weight };
    });
  });
  if (memberRows.length > 0) {
    await db.insert(personaPanelMembers).values(memberRows);
  }

  return {
    personasCreated: PERSONA_TEMPLATES.filter((t) =>
      createdPersonaKeys.has(t.templateKey),
    ).map((t) => t.name),
    personasSkipped: PERSONA_TEMPLATES.filter(
      (t) => !createdPersonaKeys.has(t.templateKey),
    ).map((t) => t.name),
    panelsCreated: PERSONA_PANEL_TEMPLATES.filter((t) =>
      newPanelIdByKey.has(t.templateKey),
    ).map((t) => t.name),
    panelsSkipped: PERSONA_PANEL_TEMPLATES.filter(
      (t) => !newPanelIdByKey.has(t.templateKey),
    ).map((t) => t.name),
  };
}
