import { caseUpgradesAfter, getCaseTemplate } from "../case-templates";
import type { AvailableProjectCase } from "../project-cases";
import type { CreateProjectWithConfigInput } from "../schema";
import type { ProjectConfigDetail } from "../types";
import { seedToAlertRuleInput } from "./to-alert-rule-input";

/** Form values for a new project of `projectCase`: template aspects and required entity rows. */
export function toNewProjectFormValues(
  projectCase: AvailableProjectCase,
  current?: Pick<CreateProjectWithConfigInput, "name" | "description" | "sourceIds">,
  recipient?: string | null,
): CreateProjectWithConfigInput {
  const template = getCaseTemplate(projectCase);
  const entities = template.roles.flatMap((role) =>
    Array.from({ length: role.min }, () => ({
      id: crypto.randomUUID(),
      role: role.role,
      name: "",
      aliases: [],
      ambiguousAliases: [],
      withTerms: [],
      exclude: [],
    })),
  );
  const aspects = template.aspects.map((aspect) => ({
    id: crypto.randomUUID(),
    key: aspect.key,
    name: aspect.name,
    description: aspect.description,
  }));

  return {
    name: current?.name ?? "",
    description: current?.description ?? "",
    case: projectCase,
    caseVersion: template.version,
    caseConfig: structuredClone(template.defaultConfig),
    entities,
    aspects,
    sourceIds: current?.sourceIds ?? [],
    alerts: {
      rules: template.alertSeeds
        .map((seed) => seedToAlertRuleInput(seed, entities, aspects))
        .filter((rule) => rule !== null),
      channels: ["email"],
      recipients: recipient ? [recipient] : [],
      reportSchedule: "weekly",
    },
  };
}

/** Form values for editing a saved config. */
export function toProjectFormValues(
  project: { name: string; description: string | null },
  config: ProjectConfigDetail & { case: AvailableProjectCase },
): CreateProjectWithConfigInput {
  return {
    name: project.name,
    description: project.description ?? "",
    case: config.case,
    caseVersion: config.caseVersion,
    caseConfig: structuredClone(config.caseConfig),
    entities: config.entities.map((entity) => ({
      id: entity.id,
      role: entity.role,
      name: entity.name,
      aliases: entity.aliases,
      ambiguousAliases: entity.ambiguousAliases,
      withTerms: entity.withTerms,
      exclude: entity.exclude,
    })),
    aspects: config.aspects.map((aspect) => ({
      id: aspect.id,
      key: aspect.key,
      name: aspect.name,
      description: aspect.description,
    })),
    sourceIds: config.sourceIds,
    alerts: structuredClone(config.alerts),
  };
}

/**
 * Saved values moved to a newer case version: each version's `migrate` runs in
 * order. The user reviews the result in the form before saving.
 */
export function toUpgradedFormValues(
  values: CreateProjectWithConfigInput,
  targetVersion: number,
): CreateProjectWithConfigInput {
  let next = {
    caseConfig: values.caseConfig ?? {},
    entities: values.entities,
    aspects: values.aspects,
  };
  for (const version of caseUpgradesAfter(values.case, values.caseVersion)) {
    if (version.version > targetVersion) break;
    if (version.upgrade) next = version.upgrade.migrate(structuredClone(next));
  }

  return {
    ...values,
    caseVersion: targetVersion,
    caseConfig: next.caseConfig,
    entities: next.entities.map((entity) => ({ ...entity, aliases: entity.aliases ?? [] })),
    aspects: next.aspects,
  };
}
