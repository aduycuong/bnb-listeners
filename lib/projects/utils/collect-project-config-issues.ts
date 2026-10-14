import { CASE_TEMPLATES, type EntityRole } from "../case-templates";
import type { AvailableProjectCase } from "../project-cases";

export type ProjectConfigIssue = {
  path: (string | number)[];
  message: string;
};

/**
 * Case rules on top of the field schemas: case fields, allowed entity roles and
 * counts, unique aspect names. Used by `projectConfigSchema` and by the wizard
 * to check one step at a time.
 */
export function collectProjectConfigIssues(
  value: {
    case: AvailableProjectCase;
    caseConfig?: Record<string, unknown>;
    entities?: { role: EntityRole }[];
    aspects?: { name: string }[];
  },
  parts: { config?: boolean; entities?: boolean; aspects?: boolean } = {
    config: true,
    entities: true,
    aspects: true,
  },
): ProjectConfigIssue[] {
  const template = CASE_TEMPLATES[value.case];
  const issues: ProjectConfigIssue[] = [];

  if (parts.config) {
    const config = template.configSchema.safeParse(value.caseConfig ?? {});
    if (!config.success) {
      for (const issue of config.error.issues) {
        issues.push({
          path: ["caseConfig", ...issue.path.map(String)],
          message: issue.message,
        });
      }
    }
  }

  if (parts.entities) {
    const entities = value.entities ?? [];
    const allowed = new Set(template.roles.map((item) => item.role));
    entities.forEach((entity, index) => {
      if (!allowed.has(entity.role)) {
        issues.push({
          path: ["entities", index, "role"],
          message: `Vai trò "${entity.role}" không dùng cho case này.`,
        });
      }
    });

    for (const role of template.roles) {
      const count = entities.filter((entity) => entity.role === role.role).length;
      if (count >= role.min && count <= role.max) continue;
      issues.push({
        path: ["entities"],
        message:
          role.min === role.max
            ? `Cần đúng ${role.min} mục "${role.label}".`
            : count < role.min
              ? `Cần ít nhất ${role.min} mục "${role.label}".`
              : `Tối đa ${role.max} mục "${role.label}".`,
      });
    }
  }

  if (parts.aspects) {
    const names = new Set<string>();
    (value.aspects ?? []).forEach((aspect, index) => {
      const key = aspect.name.trim().toLowerCase();
      if (key && names.has(key)) {
        issues.push({ path: ["aspects", index, "name"], message: "Khía cạnh bị trùng tên." });
      }
      names.add(key);
    });
  }

  return issues;
}
