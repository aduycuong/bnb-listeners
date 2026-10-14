import { ALERT_TEMPLATES } from "../alert-templates";
import { CASE_TEMPLATES } from "../case-templates";
import type { AvailableProjectCase } from "../project-cases";
import type { CreateProjectWithConfigInput } from "../schema";
import type { ProjectConfigDetail } from "../types";

/** Form values for a new project of `projectCase`: template aspects and required entity rows. */
export function toNewProjectFormValues(
  projectCase: AvailableProjectCase,
  current?: Pick<CreateProjectWithConfigInput, "name" | "description" | "mode" | "sourceIds">,
  recipient?: string | null,
): CreateProjectWithConfigInput {
  const template = CASE_TEMPLATES[projectCase];

  return {
    name: current?.name ?? "",
    description: current?.description ?? "",
    case: projectCase,
    mode: current?.mode ?? "live",
    caseConfig: structuredClone(template.defaultConfig),
    entities: template.roles.flatMap((role) =>
      Array.from({ length: role.min }, () => ({
        role: role.role,
        name: "",
        aliases: [],
        withTerms: [],
        exclude: [],
      })),
    ),
    aspects: template.aspects.map((aspect) => ({
      name: aspect.name,
      description: aspect.description,
    })),
    sourceIds: current?.sourceIds ?? [],
    alerts: {
      // Rules needing a case field the user has not filled start disabled.
      rules: ALERT_TEMPLATES[projectCase].map((rule) => ({
        key: rule.key,
        enabled: !rule.requiresConfig,
        threshold: rule.defaultThreshold,
      })),
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
