import { ALERT_TEMPLATES } from "../alert-templates";
import type { AvailableProjectCase } from "../project-cases";
import type { ProjectAlertsInput } from "../schema";

/** One row per template rule; rules missing from the input are stored disabled at the default threshold. */
export function toAlertRuleRows(
  projectCase: AvailableProjectCase,
  rules: ProjectAlertsInput["rules"],
) {
  const byKey = new Map(rules.map((rule) => [rule.key, rule]));

  return ALERT_TEMPLATES[projectCase].map((template) => {
    const input = byKey.get(template.key);
    return {
      key: template.key,
      type: template.type,
      params: {
        ...template.params,
        threshold: input?.threshold ?? template.defaultThreshold,
      },
      enabled: input?.enabled ?? false,
    };
  });
}
