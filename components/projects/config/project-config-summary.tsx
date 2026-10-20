"use client";

import { useSelectableSources } from "@/components/projects/config/project-sources-fields";
import {
  ALERT_RULE_KIND_DEFS,
  ALERT_WINDOW_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
  REPORT_SCHEDULE_LABELS,
  type NotificationChannel,
  type ReportSchedule,
} from "@/lib/projects/alert-templates";
import {
  getCaseTemplate,
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
  ambiguousAliases?: string[];
  withTerms?: string[];
  exclude?: string[];
}) {
  const include = toQueryInclude({
    name: entity.name,
    aliases: entity.aliases ?? [],
    ambiguousAliases: entity.ambiguousAliases ?? [],
  });
  let text = `(${quote(include)})`;
  if (entity.withTerms?.length) text += ` AND (${quote(entity.withTerms)})`;
  if (entity.exclude?.length) text += ` NOT (${quote(entity.exclude)})`;
  return text;
}

function describeScope(values: CreateProjectWithConfigInput, scope: string) {
  const [type, ref] = scope.split(":");
  if (type === "entity") {
    return values.entities?.find((entity) => entity.id === ref)?.name || "(đối tượng đã xóa)";
  }
  if (type === "aspect") {
    const name = values.aspects?.find((aspect) => aspect.id === ref)?.name;
    return name ? `khía cạnh ${name}` : "(khía cạnh đã xóa)";
  }
  if (type === "each_role") {
    const role = getCaseTemplate(values.case, values.caseVersion).roles.find((item) => item.role === ref);
    return `từng mục ${role?.label.toLowerCase() ?? ref}`;
  }
  return "toàn project";
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
  const roles = getCaseTemplate(values.case, values.caseVersion).roles;
  const sourceNames = (values.sourceIds ?? []).map(
    (id) => data?.items.find((item) => item.id === id)?.name ?? id,
  );

  const rows: [string, React.ReactNode][] = [
    ["Kiểu case", caseLabel],
    ["Tên project", values.name || "—"],
    ["Mô tả", values.description || "—"],
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
    [
      "Cảnh báo",
      (() => {
        const enabled = (values.alerts?.rules ?? []).filter((rule) => rule.enabled);
        if (!enabled.length) return "Không bật cảnh báo nào";
        return (
          <ul className="flex flex-col gap-0.5">
            {enabled.map((rule) => {
              const def = ALERT_RULE_KIND_DEFS[rule.kind];
              const window = rule.window ? ` trong ${ALERT_WINDOW_LABELS[rule.window]}` : "";
              const keywords = rule.keywords?.length ? ` (${rule.keywords.join(", ")})` : "";
              return (
                <li key={rule.id}>
                  {def.label}, {describeScope(values, rule.scope)}: {def.thresholdLabel.toLowerCase()}{" "}
                  {rule.threshold} {def.unit}
                  {window}
                  {keywords}
                </li>
              );
            })}
          </ul>
        );
      })(),
    ],
    [
      "Gửi qua",
      [
        (values.alerts?.channels ?? [])
          .map((channel) => NOTIFICATION_CHANNEL_LABELS[channel as NotificationChannel])
          .join(", "),
        (values.alerts?.recipients ?? []).join(", "),
      ]
        .filter(Boolean)
        .join(" · ") || "—",
    ],
    [
      "Báo cáo AI",
      REPORT_SCHEDULE_LABELS[(values.alerts?.reportSchedule ?? "weekly") as ReportSchedule],
    ],
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
