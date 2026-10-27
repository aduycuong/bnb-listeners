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
  "project_compare",
  "brand_compare",
] as const;

export type ProjectCase = (typeof PROJECT_CASES)[number];

/** Cases that can be created with a real config. The rest show as "coming soon". */
export const AVAILABLE_PROJECT_CASES = ["project", "market", "brand"] as const;

export type AvailableProjectCase = (typeof AVAILABLE_PROJECT_CASES)[number];

/**
 * Cases that compare a primary project with 1–3 competitors of one listening case (D30). A
 * compare project only reads its members: no sources, entities, enrichers, collection, Match
 * or L4 of its own.
 */
export const COMPARE_CASES = ["project_compare", "brand_compare"] as const;

export type CompareCase = (typeof COMPARE_CASES)[number];

/** The listening case whose projects a compare case takes. */
export const COMPARE_CASE_OF: Record<CompareCase, AvailableProjectCase> = {
  project_compare: "project",
  brand_compare: "brand",
};

/** Competitors besides the primary project: 2–4 members in all. */
export const COMPARE_COMPETITORS = { min: 1, max: 3 } as const;

export function isCompareCase(value: string): value is CompareCase {
  return (COMPARE_CASES as readonly string[]).includes(value);
}

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
  {
    labelKey: "caseGroups.compare",
    cases: ["project_compare", "brand_compare"],
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
  project_compare: "⚖️",
  brand_compare: "🆚",
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
