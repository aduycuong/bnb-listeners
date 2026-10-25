"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import { useSelectableSources } from "@/components/projects/config/project-sources-fields";
import { REPORT_SCHEDULE_LABELS } from "@/lib/projects/alert-templates";
import { getCaseTemplate } from "@/lib/projects/case-templates";
import type {
  CreateProjectWithConfigBody,
  CreateProjectWithConfigInput,
} from "@/lib/projects/schema";
import { cn } from "@/lib/utils";

type ProjectForm = UseFormReturn<
  CreateProjectWithConfigInput,
  unknown,
  CreateProjectWithConfigBody
>;

const MAX_NAMES = 4;

export type ProjectConfigSection = "case" | "info" | "sources" | "entities" | "aspects" | "alerts";

/** `edit` shows a "Sửa" link; `upcoming` dims a section the wizard has not reached. */
export type ProjectConfigSectionState = "edit" | "upcoming" | "plain";

function joinNames(names: string[]) {
  const shown = names.slice(0, MAX_NAMES).join(", ");
  return names.length > MAX_NAMES ? `${shown} +${names.length - MAX_NAMES}` : shown;
}

/** Live config overview beside the create wizard and project settings, updated as the user types. */
export function ProjectConfigLiveSummary({
  form,
  workspaceId,
  caseLabel,
  projectName,
  sectionState,
  onEdit,
}: {
  form: ProjectForm;
  workspaceId: string;
  caseLabel: string | null;
  /** Saved name when it is edited outside this form (project settings). */
  projectName?: string;
  sectionState: (section: ProjectConfigSection) => ProjectConfigSectionState;
  onEdit: (section: ProjectConfigSection) => void;
}) {
  const values = useWatch({ control: form.control });
  const { data: sources } = useSelectableSources(workspaceId);

  if (!caseLabel || !values.case) {
    return (
      <SummaryShell>
        <p className="text-[13px] text-muted-foreground">
          Chọn kiểu case để bắt đầu. Cấu hình sẽ hiện ở đây khi bạn điền.
        </p>
      </SummaryShell>
    );
  }

  const roles = getCaseTemplate(values.case, values.caseVersion ?? 1).roles;
  const entities = (values.entities ?? []).filter((entity) => entity?.name?.trim());
  const sourceIds = values.sourceIds ?? [];
  const sourceNames = sourceIds
    .map((id) => sources?.items.find((source) => source.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const aspects = (values.aspects ?? []).filter((aspect) => aspect?.name?.trim());
  const rules = values.alerts?.rules ?? [];
  const enabledRules = rules.filter((rule) => rule?.enabled).length;
  const recipients = values.alerts?.recipients?.length ?? 0;
  const schedule = values.alerts?.reportSchedule;

  return (
    <SummaryShell>
      <dl className="flex flex-col">
        <Row label="Kiểu case" section="case" state={sectionState("case")} onEdit={onEdit}>
          {caseLabel}
        </Row>
        <Row label="Tên project" section="info" state={sectionState("info")} onEdit={onEdit}>
          {(projectName ?? values.name)?.trim() || <Empty>Chưa đặt tên</Empty>}
        </Row>
        <Row label="Nguồn" section="sources" state={sectionState("sources")} onEdit={onEdit}>
          {sourceIds.length ? (
            <>
              <Count value={sourceIds.length} unit="nguồn" />
              {sourceNames.length ? <Detail>{joinNames(sourceNames)}</Detail> : null}
            </>
          ) : (
            <Empty>Chưa chọn</Empty>
          )}
        </Row>
        <Row label="Đối tượng theo dõi" section="entities" state={sectionState("entities")} onEdit={onEdit}>
          {entities.length ? (
            roles.map((role) => {
              const names = entities
                .filter((entity) => entity.role === role.role)
                .map((entity) => entity.name!.trim());
              if (!names.length) return null;
              return (
                <Detail key={role.role}>
                  <span className="text-foreground">{role.label}:</span> {joinNames(names)}
                </Detail>
              );
            })
          ) : (
            <Empty>Chưa có</Empty>
          )}
        </Row>
        <Row label="Khía cạnh" section="aspects" state={sectionState("aspects")} onEdit={onEdit}>
          {aspects.length ? (
            <>
              <Count value={aspects.length} unit="khía cạnh" />
              <Detail>{joinNames(aspects.map((aspect) => aspect.name!.trim()))}</Detail>
            </>
          ) : (
            <Empty>Chưa có</Empty>
          )}
        </Row>
        <Row label="Cảnh báo & báo cáo" section="alerts" state={sectionState("alerts")} onEdit={onEdit}>
          <Count value={enabledRules} unit={`/ ${rules.length} cảnh báo bật`} />
          <Detail>
            {recipients ? `${recipients} người nhận` : "Chưa có người nhận"}
            {schedule ? ` · Báo cáo: ${REPORT_SCHEDULE_LABELS[schedule].toLowerCase()}` : null}
          </Detail>
        </Row>
      </dl>
    </SummaryShell>
  );
}

function SummaryShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-border bg-card px-4 py-3.5">
      <h2 className="mb-2 text-[13px] font-semibold">Tóm tắt cấu hình</h2>
      {children}
    </div>
  );
}

function Row({
  label,
  section,
  state,
  onEdit,
  children,
}: {
  label: string;
  section: ProjectConfigSection;
  state: ProjectConfigSectionState;
  onEdit: (section: ProjectConfigSection) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border/70 py-2.5 first:border-t-0 first:pt-1">
      <dt className="flex items-center justify-between gap-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
        {state === "edit" ? (
          <button
            type="button"
            className="text-[11px] font-medium tracking-normal text-primary normal-case hover:underline"
            onClick={() => onEdit(section)}
          >
            Sửa
          </button>
        ) : null}
      </dt>
      <dd
        className={cn(
          "mt-1 flex flex-col gap-0.5 text-[13px]",
          state === "upcoming" && "opacity-60",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function Count({ value, unit }: { value: number; unit: string }) {
  return (
    <span>
      <b className="font-semibold">{value}</b> {unit}
    </span>
  );
}

function Detail({ children }: { children: React.ReactNode }) {
  return <span className="text-xs leading-snug text-muted-foreground">{children}</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground italic">{children}</span>;
}
