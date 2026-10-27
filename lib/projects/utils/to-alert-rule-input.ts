import {
  ALERT_RULE_KIND_DEFS,
  type AlertRuleKind,
  type AlertRuleSeed,
} from "../alert-templates";
import type { ProjectAlertsInput } from "../schema";

type AlertRuleInput = ProjectAlertsInput["rules"][number];

/** A new form rule of `kind` with the kind's defaults. */
export function toAlertRuleInput(
  kind: AlertRuleKind,
  overrides: Partial<Omit<AlertRuleInput, "id" | "kind">> = {},
): AlertRuleInput {
  const def = ALERT_RULE_KIND_DEFS[kind];
  return {
    id: crypto.randomUUID(),
    kind,
    enabled: !def.requiresConfig,
    scope: "project",
    threshold: def.defaultThreshold,
    window: def.defaultWindow,
    minMentions: def.defaultMinMentions,
    keywords: [],
    ...overrides,
  };
}

/** Resolves a case seed against the form's aspect ids; null when its target is missing. */
export function seedToAlertRuleInput(
  seed: AlertRuleSeed,
  aspects: { id: string; key?: string }[],
): AlertRuleInput | null {
  let scope = "project";
  if (seed.scope.type === "aspect_key") {
    const key = seed.scope.key;
    const aspect = aspects.find((item) => item.key === key);
    if (!aspect) return null;
    scope = `aspect:${aspect.id}`;
  } else if (seed.scope.type === "each_role") {
    scope = `each_role:${seed.scope.role}`;
  }

  const def = ALERT_RULE_KIND_DEFS[seed.kind];
  return toAlertRuleInput(seed.kind, {
    scope,
    enabled: seed.enabled ?? !def.requiresConfig,
    threshold: seed.threshold ?? def.defaultThreshold,
    window: seed.window ?? def.defaultWindow,
    keywords: seed.keywords ?? [],
  });
}
