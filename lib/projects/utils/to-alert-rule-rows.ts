import type { AlertRule } from "@/db/schema";

import {
  ALERT_RULE_KINDS,
  ALERT_WINDOWS,
  type AlertRuleKind,
  type AlertWindow,
} from "../alert-templates";
import type { ProjectAlertsInput } from "../schema";

type AlertRuleInput = ProjectAlertsInput["rules"][number];

type StoredScope =
  | { type: "project" }
  | { type: "entity"; entityId: string }
  | { type: "aspect"; aspectId: string }
  | { type: "each_role"; role: string };

function toStoredScope(scope: string): StoredScope {
  const [type, ref = ""] = scope.split(":");
  if (type === "entity") return { type, entityId: ref };
  if (type === "aspect") return { type, aspectId: ref };
  if (type === "each_role") return { type, role: ref };
  return { type: "project" };
}

function toScopeString(scope: unknown): string {
  const value = (scope ?? {}) as Partial<Record<string, string>>;
  if (value.type === "entity" && value.entityId) return `entity:${value.entityId}`;
  if (value.type === "aspect" && value.aspectId) return `aspect:${value.aspectId}`;
  if (value.type === "each_role" && value.role) return `each_role:${value.role}`;
  return "project";
}

/** `alert_rules` values for one form rule; the scope is stored as an object for the evaluator. */
export function toAlertRuleRow(rule: AlertRuleInput, sortOrder: number) {
  return {
    id: rule.id,
    kind: rule.kind,
    enabled: rule.enabled,
    sortOrder,
    params: {
      scope: toStoredScope(rule.scope),
      threshold: rule.threshold,
      window: rule.window,
      minMentions: rule.minMentions,
      keywords: rule.keywords,
    },
  };
}

/** Form rule for a stored row; rows with an unknown kind are dropped. */
export function fromAlertRuleRow(row: AlertRule): AlertRuleInput | null {
  if (!(ALERT_RULE_KINDS as readonly string[]).includes(row.kind)) return null;
  const params = row.params;
  const window = params.window;
  return {
    id: row.id,
    kind: row.kind as AlertRuleKind,
    enabled: row.enabled,
    scope: toScopeString(params.scope),
    threshold: typeof params.threshold === "number" ? params.threshold : 1,
    window: (ALERT_WINDOWS as readonly string[]).includes(window as string)
      ? (window as AlertWindow)
      : null,
    minMentions: typeof params.minMentions === "number" ? params.minMentions : null,
    keywords: Array.isArray(params.keywords)
      ? params.keywords.filter((item): item is string => typeof item === "string")
      : [],
  };
}
