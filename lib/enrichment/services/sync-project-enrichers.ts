import { eq } from "drizzle-orm";

import { projectEnrichers } from "@/db/schema";
import { db } from "@/lib/db";
import { type CaseTemplate, defaultCaseEnrichers } from "@/lib/projects/case-templates";

import type { EnricherKey } from "../registry";

/**
 * Makes sure a project has a `project_enrichers` row for every default
 * enricher of its case template (D18). Rows the user changed are kept;
 * `enable` turns the named ones on as well.
 */
export async function syncProjectEnrichers(params: {
  projectId: string;
  template: CaseTemplate;
  enable?: EnricherKey[];
}): Promise<{ added: EnricherKey[]; enabled: EnricherKey[] }> {
  const defaults = defaultCaseEnrichers(params.template);
  const existing = await db
    .select({ key: projectEnrichers.enricherKey, enabled: projectEnrichers.enabled })
    .from(projectEnrichers)
    .where(eq(projectEnrichers.projectId, params.projectId));
  const byKey = new Map(existing.map((row) => [row.key, row.enabled]));

  const added = defaults.filter((key) => !byKey.has(key));
  const toEnable = (params.enable ?? []).filter((key) => byKey.get(key) !== true);
  if (added.length === 0 && toEnable.length === 0) return { added: [], enabled: [] };

  const rows = [...new Set([...added, ...toEnable])].map((key) => ({
    projectId: params.projectId,
    enricherKey: key,
    enabled: true,
  }));
  await db
    .insert(projectEnrichers)
    .values(rows)
    .onConflictDoUpdate({
      target: [projectEnrichers.projectId, projectEnrichers.enricherKey],
      set: { enabled: true, updatedAt: new Date() },
    });
  return { added, enabled: toEnable };
}
