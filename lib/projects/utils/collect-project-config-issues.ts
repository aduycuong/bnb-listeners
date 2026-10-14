import { ALERT_RULE_KIND_DEFS, type AlertRuleKind } from "../alert-templates";
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
    entities?: { id?: string; role: EntityRole }[];
    aspects?: { id?: string; name: string }[];
    alerts?: {
      rules?: {
        kind: AlertRuleKind;
        enabled: boolean;
        scope: string;
        window?: string | null;
        keywords?: string[];
      }[];
      channels?: string[];
      recipients?: string[];
      reportSchedule?: string;
    };
  },
  parts: { config?: boolean; entities?: boolean; aspects?: boolean; alerts?: boolean } = {
    config: true,
    entities: true,
    aspects: true,
    alerts: true,
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

  if (parts.alerts && value.alerts) {
    const alerts = value.alerts;
    const rules = alerts.rules ?? [];
    const entityIds = new Set((value.entities ?? []).map((entity) => entity.id));
    const aspectIds = new Set((value.aspects ?? []).map((aspect) => aspect.id));
    const roles = new Set(template.roles.map((role) => role.role as string));

    rules.forEach((rule, index) => {
      const path = ["alerts", "rules", index];
      const def = ALERT_RULE_KIND_DEFS[rule.kind];
      if (def.cases !== "all" && !def.cases.includes(value.case)) {
        issues.push({ path: [...path, "kind"], message: `"${def.label}" không dùng cho case này.` });
        return;
      }

      const [scopeType, scopeRef] = rule.scope.split(":") as [string, string | undefined];
      if (!(def.scopes as string[]).includes(scopeType)) {
        issues.push({ path: [...path, "scope"], message: "Phạm vi không dùng cho loại cảnh báo này." });
      } else if (scopeType === "entity" && !entityIds.has(scopeRef)) {
        issues.push({ path: [...path, "scope"], message: "Đối tượng của cảnh báo đã bị xóa." });
      } else if (scopeType === "aspect" && !aspectIds.has(scopeRef)) {
        issues.push({ path: [...path, "scope"], message: "Khía cạnh của cảnh báo đã bị xóa." });
      } else if (scopeType === "each_role" && !roles.has(scopeRef ?? "")) {
        issues.push({ path: [...path, "scope"], message: "Phạm vi không dùng cho case này." });
      }

      if (def.defaultWindow && !rule.window) {
        issues.push({ path: [...path, "window"], message: "Chọn khoảng thời gian." });
      }
      if (def.usesKeywords && (rule.keywords ?? []).length === 0) {
        issues.push({ path: [...path, "keywords"], message: "Nhập ít nhất một từ khóa." });
      }
      const required = def.requiresConfig;
      if (rule.enabled && required && value.caseConfig?.[required] === undefined) {
        issues.push({
          path: [...path, "threshold"],
          message: "Cần nhập giá tham chiếu ở bước đối tượng theo dõi.",
        });
      }
    });

    const active =
      rules.some((rule) => rule.enabled) ||
      (alerts.reportSchedule !== undefined && alerts.reportSchedule !== "none");
    if (active && (alerts.channels ?? []).length === 0) {
      issues.push({ path: ["alerts", "channels"], message: "Chọn ít nhất một kênh gửi." });
    }
    if (active && (alerts.channels ?? []).includes("email") && (alerts.recipients ?? []).length === 0) {
      issues.push({ path: ["alerts", "recipients"], message: "Nhập ít nhất một email nhận." });
    }
  }

  return issues;
}
