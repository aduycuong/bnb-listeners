import { asc, count } from "drizzle-orm";

import { personaPanelMembers, personaPanels } from "@/db/schema";
import { db } from "@/lib/db";

import type { PanelRow } from "../types";

export async function listPersonaPanels(): Promise<{ items: PanelRow[] }> {
  const [rows, memberCounts] = await Promise.all([
    db.select().from(personaPanels).orderBy(asc(personaPanels.name)),
    db
      .select({ panelId: personaPanelMembers.panelId, value: count() })
      .from(personaPanelMembers)
      .groupBy(personaPanelMembers.panelId),
  ]);

  const membersBy = new Map(memberCounts.map((row) => [row.panelId, row.value]));

  return {
    items: rows.map((panel) => ({
      id: panel.id,
      templateKey: panel.templateKey,
      name: panel.name,
      description: panel.description,
      memberCount: membersBy.get(panel.id) ?? 0,
      updatedAt: panel.updatedAt.toISOString(),
    })),
  };
}
