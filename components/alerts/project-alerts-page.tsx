"use client";

import Link from "next/link";

import { ReportGrid, ReportPanel, ReportTable, SentimentPill } from "@/components/metrics/report-ui/report-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import type { AlertStatus } from "@/lib/alerts/types";
import { AQUA_ALERT_LABEL, AQUA_PAGE_META } from "@/lib/projects/aqua-demo";

import { MetricsEmpty } from "../metrics/metrics-page-header";
import { useProjectAlerts, type AlertsApiScope } from "./use-alerts-api";

const STATUS_LABEL: Record<AlertStatus, string> = {
  open: "Chỉ ghi nhận",
  emailed: "Đã gửi email",
  email_failed: "Chưa gửi được",
};

/** Alerts page, laid out as the approved demo: a feed beside the enabled rules. */
export function ProjectAlertsPage({
  scope,
  projectName,
  banner,
  settingsHref,
}: {
  scope: AlertsApiScope;
  projectName: string;
  banner: ProjectPageBannerProps;
  settingsHref: string;
}) {
  const { data, error, isPending, isFetching } = useProjectAlerts(scope);
  const loading = isPending ? "Đang tải…" : null;

  return (
    <div className={projectReportPageClassName}>
      <div className="min-w-0">
        <h1 className="font-heading text-[22px] leading-none font-bold tracking-[-0.015em]">
          {AQUA_PAGE_META.alerts.title}
        </h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {projectName} · kiểm tra mỗi giờ · chỉ gửi email
          {isFetching && !isPending ? " · đang tải…" : ""}
        </p>
      </div>
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <ReportGrid>
        <ReportPanel title="Cảnh báo gần đây" span="s7" scope="common">
          {error ? (
            <MetricsEmpty>Không tải được cảnh báo.</MetricsEmpty>
          ) : data && data.alerts.length > 0 ? (
            <ul>
              {data.alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border-b border-border py-3.5 last:border-b-0"
                >
                  <SentimentPill sentiment={alert.level} label={AQUA_ALERT_LABEL[alert.level]} />
                  <div className="min-w-0">
                    <h4 className="mb-0.5 font-heading text-sm font-bold tracking-[-0.01em]">
                      {alert.title}
                    </h4>
                    <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                      {alert.body}
                    </p>
                  </div>
                  <div className="text-right">
                    <time className="block text-xs whitespace-nowrap text-muted-foreground">
                      {formatAlertTime(alert.triggeredAt)}
                    </time>
                    <div className="mt-1 text-xs text-foreground/70" title={alert.emailError ?? undefined}>
                      {STATUS_LABEL[alert.status]}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <MetricsEmpty>
              {loading ?? "Chưa có cảnh báo. Quy tắc được kiểm tra mỗi giờ."}
            </MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Quy tắc cảnh báo đang bật"
          span="s5"
          scope="common"
          note={
            <>
              Chỉnh trong{" "}
              <Link href={settingsHref} className="font-semibold text-primary">
                Cài đặt dự án
              </Link>
              .
              {data && data.recipientCount === 0
                ? " Chưa có email nhận, nên cảnh báo chỉ được ghi lại."
                : ""}
            </>
          }
        >
          {error ? (
            <MetricsEmpty>Không tải được quy tắc.</MetricsEmpty>
          ) : data && data.rules.length > 0 ? (
            <ReportTable
              headers={[{ label: "Quy tắc" }, { label: "Ngưỡng" }, { label: "Gửi đến" }]}
              rows={data.rules.map((rule) => [
                <span key={rule.id}>
                  {rule.label}
                  {rule.scope !== "Toàn project" ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{rule.scope}</span>
                  ) : null}
                </span>,
                rule.threshold,
                rule.deliversEmail ? "Email" : "Không gửi",
              ])}
            />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa bật quy tắc nào."}</MetricsEmpty>
          )}
        </ReportPanel>
      </ReportGrid>
    </div>
  );
}

function formatAlertTime(iso: string) {
  const date = new Date(iso);
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return `${date.getDate()}/${date.getMonth() + 1}`;
}
