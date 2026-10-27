"use client";

import type { ReactNode } from "react";

import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";

import { MetricsPageHeader } from "../metrics-page-header";
import type { CompareMemberBase } from "./compare-members";

/** Header, banner and member notices shared by every page of a compare project (D30). */
export function CompareReportShell({
  title,
  subtitle,
  days,
  onDaysChange,
  loading,
  banner,
  error,
  issues = [],
  warnings = [],
  children,
}: {
  title: string;
  subtitle: string;
  days: number;
  onDaysChange: (days: number) => void;
  loading: boolean;
  banner: ProjectPageBannerProps;
  error: Error | null;
  issues?: string[];
  warnings?: string[];
  children: ReactNode;
}) {
  return (
    <div className={projectReportPageClassName}>
      <MetricsPageHeader
        title={title}
        subtitle={subtitle}
        days={days}
        onDaysChange={onDaysChange}
        loading={loading}
      />
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      {issues.length ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {issues.join(" ")} Sửa danh sách project trong cài đặt.
        </p>
      ) : null}
      {warnings.length ? (
        <p className="rounded-xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          {warnings.join(" ")}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** Side-by-side columns, one per member, for lists that do not line up (topics, sources…). */
export function MemberColumns<M extends CompareMemberBase>({
  members,
  render,
}: {
  members: M[];
  render: (member: M) => ReactNode;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      {members.map((member) => (
        <div key={member.id} className="min-w-0">
          <h4 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
            <i className="size-2.5 rounded-full" style={{ background: member.color }} />
            <span className="truncate">{member.primary ? `★ ${member.name}` : member.name}</span>
          </h4>
          {render(member)}
        </div>
      ))}
    </div>
  );
}
