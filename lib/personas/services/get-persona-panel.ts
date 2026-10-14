import { desc, eq } from "drizzle-orm";

import { personaPanelMembers, personaPanels, personas } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { PanelDetail } from "../types";

export async function getPersonaPanel(params: { id: string }): Promise<PanelDetail> {
  const [panel] = await db
    .select()
    .from(personaPanels)
    .where(eq(personaPanels.id, params.id))
    .limit(1);

  if (!panel) throw new NotFoundError("persona panel", params.id);

  const members = await db
    .select({
      personaId: personas.id,
      name: personas.name,
      kind: personas.kind,
      weight: personaPanelMembers.weight,
    })
    .from(personaPanelMembers)
    .innerJoin(personas, eq(personas.id, personaPanelMembers.personaId))
    .where(eq(personaPanelMembers.panelId, panel.id))
    .orderBy(desc(personaPanelMembers.weight));

  return {
    id: panel.id,
    templateKey: panel.templateKey,
    name: panel.name,
    description: panel.description,
    memberCount: members.length,
    updatedAt: panel.updatedAt.toISOString(),
    members: members.map((member) => ({
      ...member,
      kind: member.kind === "organization" ? "organization" : "individual",
    })),
  };
}
