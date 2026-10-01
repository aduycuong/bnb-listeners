export const PROJECT_CASES = [
  "general",
  "campaign",
  "crisis",
  "reputation",
  "competitor",
  "trend",
  "market",
  "cx",
  "care",
  "lead",
  "kol",
  "employer",
] as const;

export type ProjectCase = (typeof PROJECT_CASES)[number];

export const PROJECT_CASE_GROUPS: {
  labelKey: string;
  cases: readonly ProjectCase[];
}[] = [
  {
    labelKey: "caseGroups.brand",
    cases: ["general", "campaign", "crisis", "reputation"],
  },
  {
    labelKey: "caseGroups.market",
    cases: ["competitor", "trend", "market"],
  },
  {
    labelKey: "caseGroups.customer",
    cases: ["cx", "care", "lead"],
  },
  {
    labelKey: "caseGroups.partners",
    cases: ["kol", "employer"],
  },
];

export const PROJECT_CASE_ICONS: Record<ProjectCase, string> = {
  general: "🧭",
  campaign: "🚀",
  crisis: "🚨",
  reputation: "🏛️",
  competitor: "⚔️",
  trend: "📡",
  market: "🗺️",
  cx: "🛠️",
  care: "💬",
  lead: "🎯",
  kol: "⭐",
  employer: "👥",
};

export function parseProjectCase(value: string): ProjectCase {
  if ((PROJECT_CASES as readonly string[]).includes(value)) {
    return value as ProjectCase;
  }

  return "general";
}
