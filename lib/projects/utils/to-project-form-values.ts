import { ALERT_RULE_SEEDS } from "../alert-templates";
import { CASE_TEMPLATES } from "../case-templates";
import type { AvailableProjectCase } from "../project-cases";
import type { CreateProjectWithConfigInput } from "../schema";
import type { ProjectConfigDetail } from "../types";
import { seedToAlertRuleInput } from "./to-alert-rule-input";

/** Form values for a new project of `projectCase`: template aspects and required entity rows. */
export function toNewProjectFormValues(
  projectCase: AvailableProjectCase,
  current?: Pick<CreateProjectWithConfigInput, "name" | "description" | "mode" | "sourceIds">,
  recipient?: string | null,
): CreateProjectWithConfigInput {
  const template = CASE_TEMPLATES[projectCase];
  const entities = template.roles.flatMap((role) =>
    Array.from({ length: role.min }, () => ({
      id: crypto.randomUUID(),
      role: role.role,
      name: "",
      aliases: [],
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
    mode: current?.mode ?? "live",
    caseConfig: structuredClone(template.defaultConfig),
    entities,
    aspects,
    sourceIds: current?.sourceIds ?? [],
    alerts: {
      rules: ALERT_RULE_SEEDS[projectCase]
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
    mode: config.mode,
    caseConfig: structuredClone(config.caseConfig),
    entities: config.entities.map((entity) => ({
      id: entity.id,
      role: entity.role,
      name: entity.name,
      aliases: entity.aliases,
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
