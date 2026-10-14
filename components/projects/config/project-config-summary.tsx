"use client";

import { useSelectableSources } from "@/components/projects/config/project-sources-fields";
import {
  CASE_TEMPLATES,
  REPORT_PERIOD_LABELS,
} from "@/lib/projects/case-templates";
import type { CreateProjectWithConfigInput } from "@/lib/projects/schema";
import { toQueryInclude } from "@/lib/projects/utils/to-query-include";

function quote(terms: string[]) {
  return terms.map((term) => `"${term}"`).join(" OR ");
}

/** Generated query for one entity, written in the boolean style users know. */
function describeQuery(entity: {
  name: string;
  aliases?: string[];
  withTerms?: string[];
  exclude?: string[];
}) {
  const include = toQueryInclude({ name: entity.name, aliases: entity.aliases ?? [] });
  let text = `(${quote(include)})`;
  if (entity.withTerms?.length) text += ` AND (${quote(entity.withTerms)})`;
  if (entity.exclude?.length) text += ` NOT (${quote(entity.exclude)})`;
  return text;
}

function describeCaseConfig(values: CreateProjectWithConfigInput) {
  const config = values.caseConfig ?? {};
  const parts: string[] = [];
  const text = (key: string) => (typeof config[key] === "string" ? (config[key] as string) : "");
  const num = (key: string) => (typeof config[key] === "number" ? (config[key] as number) : null);

  if (values.case === "project") {
    const place = [text("district"), text("province")].filter(Boolean).join(", ");
    if (place) parts.push(place);
    if (text("segment")) parts.push(text("segment"));
    if (text("stage")) parts.push(text("stage"));
    if (num("priceRef") !== null) parts.push(`giá tham chiếu ${num("priceRef")} triệu/m²`);
  }
  if (values.case === "market") {
    const segments = Array.isArray(config.segments) ? (config.segments as string[]) : [];
    if (segments.length) parts.push(segments.join(", "));
    const min = num("priceMin");
    const max = num("priceMax");
    if (min !== null || max !== null) parts.push(`giá ${min ?? "…"}–${max ?? "…"} tỷ`);
  }
  const period = text("period") as keyof typeof REPORT_PERIOD_LABELS;
  if (REPORT_PERIOD_LABELS[period]) parts.push(`báo cáo ${REPORT_PERIOD_LABELS[period].toLowerCase()}`);

  return parts.join(" · ") || "—";
}

export function ProjectConfigSummary({
  values,
  workspaceId,
  caseLabel,
}: {
  values: CreateProjectWithConfigInput;
  workspaceId: string;
  caseLabel: string;
}) {
  const { data } = useSelectableSources(workspaceId);
  const roles = CASE_TEMPLATES[values.case].roles;
  const sourceNames = (values.sourceIds ?? []).map(
    (id) => data?.items.find((item) => item.id === id)?.name ?? id,
  );

  const rows: [string, React.ReactNode][] = [
    ["Kiểu case", caseLabel],
    ["Tên project", values.name || "—"],
    ["Mô tả", values.description || "—"],
    ["Chế độ", values.mode === "sandbox" ? "Sandbox" : "Live"],
    ["Thông tin của case", describeCaseConfig(values)],
    ...roles.map((role): [string, React.ReactNode] => {
      const entities = (values.entities ?? []).filter((entity) => entity.role === role.role);
      return [
        role.label,
        entities.length ? (
          <ul className="flex flex-col gap-1.5">
            {entities.map((entity, index) => (
              <li key={`${entity.name}-${index}`}>
                <b>{entity.name}</b>
                <code className="mt-0.5 block text-xs break-all text-muted-foreground">
                  {describeQuery(entity)}
                </code>
              </li>
            ))}
          </ul>
        ) : (
          "—"
        ),
      ];
    }),
    ["Khía cạnh", (values.aspects ?? []).map((aspect) => aspect.name).join(", ") || "—"],
    ["Nguồn", sourceNames.join(", ") || "—"],
  ];

  return (
    <dl className="flex flex-col">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 border-b border-border py-2 text-sm md:grid-cols-[200px_1fr]"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
