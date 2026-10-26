import { InvalidInputError } from "@/lib/common/service-errors";

// Real estate listening cases. A case is one concrete tracking situation: two
// cases may share collection and enrichment but differ in reports and views.
// See docs/decisions.md D10.
export const PROJECT_CASES = [
  "brand",
  "project",
  "ir",
  "launch",
  "broker",
  "lead",
  "rival",
  "market",
  "policy",
  "kol",
  "crisis",
  "residents",
] as const;

export type ProjectCase = (typeof PROJECT_CASES)[number];

/** Cases that can be created with a real config. The rest show as "coming soon". */
export const AVAILABLE_PROJECT_CASES = ["project", "market", "brand"] as const;

export type AvailableProjectCase = (typeof AVAILABLE_PROJECT_CASES)[number];

export const PROJECT_CASE_GROUPS: {
  labelKey: string;
  cases: readonly ProjectCase[];
}[] = [
  {
    labelKey: "caseGroups.developer",
    cases: ["brand", "project", "ir"],
  },
  {
    labelKey: "caseGroups.sales",
    cases: ["launch", "broker", "lead", "rival"],
  },
  {
    labelKey: "caseGroups.market",
    cases: ["market", "policy", "kol"],
  },
  {
    labelKey: "caseGroups.afterSales",
    cases: ["crisis", "residents"],
  },
];

export const PROJECT_CASE_ICONS: Record<ProjectCase, string> = {
  brand: "🏢",
  project: "🏙️",
  ir: "📈",
  launch: "🚀",
  broker: "🛡️",
  lead: "🎯",
  rival: "⚔️",
  market: "🗺️",
  policy: "📜",
  kol: "⭐",
  crisis: "🚨",
  residents: "🏠",
};

export function isAvailableProjectCase(
  value: ProjectCase,
): value is AvailableProjectCase {
  return (AVAILABLE_PROJECT_CASES as readonly string[]).includes(value);
}

/** Reads `projects.case`; an unknown id means a broken row, so it throws. */
export function parseProjectCase(value: string): ProjectCase {
  if ((PROJECT_CASES as readonly string[]).includes(value)) {
    return value as ProjectCase;
  }

  throw new InvalidInputError(`Unknown project case: ${value}`);
}
